// Simplified Telegram Notification API (No Database Required)
// This endpoint can be called by the client with user data

export const config = {
  maxDuration: 30,
};

interface NotificationRequest {
  botToken: string;
  chatId: string;
  accounts: Array<{
    id: string;
    platform: string;
    handle: string;
  }>;
  todayPosts: Array<{
    accountId: string;
    timestampUTC: string;
    skipped?: boolean;
  }>;
  userTimezone: string;
}

async function sendTelegramMessage(chatId: string, botToken: string, message: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
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
🌐 ${process.env.VERCEL_URL || 'your-app-url'}
  `.trim();
}

export default async function handler(req: Request) {
  // Allow CORS for client-side calls
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  try {
    const body: NotificationRequest = await req.json();

    if (!body.botToken || !body.chatId) {
      return new Response(
        JSON.stringify({ error: 'Bot token and chat ID required' }),
        { status: 400, headers }
      );
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const notifications: any[] = [];
    const errors: any[] = [];

    // Check each account for upcoming posts
    for (const account of body.accounts) {
      const accountPosts = body.todayPosts.filter(
        p => p.accountId === account.id && !p.skipped
      );

      const completedCount = accountPosts.length;
      const maxPosts = getMaxPostsForPlatform(account.platform);
      
      if (completedCount >= maxPosts) continue;

      const nextPostNumber = completedCount + 1;

      // Calculate recommended time
      let recommendedTime: Date;
      
      if (completedCount === 0) {
        recommendedTime = getBaseTimeForPlatform(account.platform, now);
      } else {
        const lastPost = accountPosts[accountPosts.length - 1];
        const cooldown = getCooldownMinutes(account.platform);
        recommendedTime = new Date(
          new Date(lastPost.timestampUTC).getTime() + cooldown * 60 * 1000
        );
      }

      // Check if it's within 5 minutes (narrower window for manual checking)
      const timeDiff = recommendedTime.getTime() - now.getTime();
      const minutesUntil = Math.floor(timeDiff / 1000 / 60);

      if (minutesUntil >= -2 && minutesUntil <= 5) {
        const message = formatPostNotification(
          account.platform,
          account.handle,
          nextPostNumber,
          recommendedTime.toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: body.userTimezone,
          })
        );

        const result = await sendTelegramMessage(body.chatId, body.botToken, message);

        if (result.success) {
          notifications.push({
            account: account.handle,
            platform: account.platform,
            postNumber: nextPostNumber,
            minutesUntil,
          });
        } else {
          errors.push({
            account: account.handle,
            error: result.error,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
        notifications,
        errors,
        checked: body.accounts.length,
      }),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('Error in notification API:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
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

