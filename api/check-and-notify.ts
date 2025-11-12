import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function to check schedules and send Telegram notifications
export const config = {
  maxDuration: 60, // 60 seconds max execution
};

interface TelegramNotification {
  chatId: string;
  botToken: string;
  message: string;
}

async function sendTelegramMessage(notification: TelegramNotification) {
  const url = `https://api.telegram.org/bot${notification.botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: notification.chatId,
        text: notification.message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    return { success: response.ok && data.ok, error: data.description };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function formatPostNotification(
  platform: string,
  handle: string,
  postNumber: number,
  scheduledTime: string
): string {
  return `
🔔 <b>Time to Post!</b>

📱 Platform: <b>${platform.toUpperCase()}</b>
👤 Account: <b>@${handle}</b>
📊 Post: <b>#${postNumber}</b>
⏰ Scheduled: <b>${scheduledTime}</b>

✅ Open the app and make your post now!
🌐 https://social-post-tracking.vercel.app
  `.trim();
}

export default async function handler(req: Request) {
  // Verify cron secret for security
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Supabase not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get current time
    const now = new Date();
    const nowISO = now.toISOString();
    
    // Time window: next 10 minutes
    const checkUntil = new Date(now.getTime() + 10 * 60 * 1000);
    const checkUntilISO = checkUntil.toISOString();

    // Fetch users with Telegram enabled
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_notifications_enabled', true)
      .not('telegram_bot_token', 'is', null)
      .not('telegram_chat_id', 'is', null);

    if (usersError) throw usersError;

    const notifications: any[] = [];
    const errors: any[] = [];

    for (const user of users || []) {
      // Get user's accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);

      if (!accounts || accounts.length === 0) continue;

      // Get today's posts for this user
      const today = now.toISOString().split('T')[0];
      const { data: todayPosts } = await supabase
        .from('post_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp_utc', `${today}T00:00:00Z`)
        .lte('timestamp_utc', `${today}T23:59:59Z`);

      // Check for notification tracking
      const { data: sentNotifications } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('notification_date', today);

      const sentNotificationKeys = new Set(
        (sentNotifications || []).map(n => `${n.account_id}_${n.post_number}`)
      );

      // For each account, calculate next post
      for (const account of accounts) {
        const accountPosts = (todayPosts || []).filter(
          p => p.account_id === account.id && !p.skipped
        );

        // Determine next post number
        const completedCount = accountPosts.length;
        const maxPosts = getMaxPostsForPlatform(account.platform);
        
        if (completedCount >= maxPosts) continue; // All posts done

        const nextPostNumber = completedCount + 1;
        const notificationKey = `${account.id}_${nextPostNumber}`;

        // Skip if already notified
        if (sentNotificationKeys.has(notificationKey)) continue;

        // Calculate recommended time for next post
        let recommendedTime: Date;
        
        if (completedCount === 0) {
          // First post - use base time
          recommendedTime = getBaseTimeForPlatform(account.platform, now);
        } else {
          // Subsequent post - last post + cooldown
          const lastPost = accountPosts[accountPosts.length - 1];
          const cooldown = getCooldownMinutes(account.platform);
          recommendedTime = new Date(
            new Date(lastPost.timestamp_utc).getTime() + cooldown * 60 * 1000
          );
        }

        // Check if it's time to notify (within next 10 minutes)
        if (recommendedTime >= now && recommendedTime <= checkUntil) {
          const message = formatPostNotification(
            account.platform,
            account.handle,
            nextPostNumber,
            recommendedTime.toLocaleString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          );

          const result = await sendTelegramMessage({
            chatId: user.telegram_chat_id,
            botToken: user.telegram_bot_token,
            message,
          });

          if (result.success) {
            // Log notification
            await supabase.from('notification_log').insert({
              user_id: user.id,
              account_id: account.id,
              post_number: nextPostNumber,
              notification_date: today,
              sent_at: nowISO,
            });

            notifications.push({
              user: user.email,
              account: account.handle,
              platform: account.platform,
              postNumber: nextPostNumber,
            });
          } else {
            errors.push({
              user: user.email,
              error: result.error,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
        notifications,
        errors,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in check-and-notify:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Helper functions
function getMaxPostsForPlatform(platform: string): number {
  const maxPosts: Record<string, number> = {
    tiktok: 4,
    threads: 6,
    instagram: 2,
    facebook: 0,
  };
  return maxPosts[platform] || 1;
}

function getCooldownMinutes(platform: string): number {
  const cooldowns: Record<string, number> = {
    tiktok: 120,
    threads: 120,
    instagram: 0,
    facebook: 0,
  };
  return cooldowns[platform] || 0;
}

function getBaseTimeForPlatform(platform: string, date: Date): Date {
  const baseTimes: Record<string, string[]> = {
    tiktok: ['05:45', '10:00', '19:00', '19:30'],
    threads: ['07:30', '10:00', '13:00', '16:00', '19:00', '20:30'],
    instagram: ['08:00', '20:00'],
  };

  const times = baseTimes[platform] || ['09:00'];
  const [hours, minutes] = times[0].split(':').map(Number);
  
  // For Bangkok timezone (UTC+7)
  const result = new Date(date);
  result.setUTCHours(hours - 7, minutes, 0, 0);
  
  return result;
}

