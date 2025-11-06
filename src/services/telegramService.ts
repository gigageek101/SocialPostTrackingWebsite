// Telegram Bot Service for Notifications

export interface TelegramMessage {
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  message: TelegramMessage
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return { success: false, error: 'Bot token or chat ID missing' };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.text,
        parse_mode: message.parseMode || 'HTML',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return { success: false, error: data.description || 'Failed to send message' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

// Notification Templates

export function formatPostReadyNotification(
  platform: string,
  handle: string,
  postNumber: number,
  shift: string,
  usTime: string,
  yourTime: string
): string {
  return `
🔔 <b>Time to Post!</b>

📱 Platform: <b>${platform.toUpperCase()}</b>
👤 Account: <b>@${handle}</b>
📊 Post: <b>${getOrdinal(postNumber)} post of ${shift} shift</b>

⏰ US Time: ${usTime}
🌍 Your Time: ${yourTime}

✅ Open the app and make your post now!
  `.trim();
}

export function formatPostCompletedNotification(
  platform: string,
  handle: string,
  postNumber: number,
  shift: string,
  waitMinutes: number
): string {
  const waitTime = formatWaitTime(waitMinutes);
  
  return `
✅ <b>Post Completed!</b>

📱 Platform: <b>${platform.toUpperCase()}</b>
👤 Account: <b>@${handle}</b>
📊 Completed: <b>${getOrdinal(postNumber)} post of ${shift} shift</b>

⏳ <b>Wait ${waitTime} before next post on this account</b>

💡 Use this time to complete your interactions!
  `.trim();
}

export function formatDailySummary(
  totalPosts: number,
  platformBreakdown: { platform: string; count: number }[],
  firstPostTime: string,
  lastPostTime: string
): string {
  let breakdown = platformBreakdown
    .map(p => `  • ${p.platform}: ${p.count} posts`)
    .join('\n');

  return `
🎉 <b>Daily Summary - All Posts Complete!</b>

📊 Total Posts: <b>${totalPosts}</b>

Platform Breakdown:
${breakdown}

⏰ Started: ${firstPostTime}
🏁 Finished: ${lastPostTime}

✨ Great work today! See you tomorrow! 🚀
  `.trim();
}

// Helper functions

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatWaitTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${hours}h ${mins}m`;
}

