// Client-side Telegram Notification Service (No Database Required)

import { PlatformAccount, PostLogEntry, UserSettings } from '../types';
import { format } from 'date-fns';

export async function checkAndSendTelegramNotifications(
  accounts: PlatformAccount[],
  postLogs: PostLogEntry[],
  userSettings: UserSettings
): Promise<{ success: boolean; notifications: number; error?: string }> {
  // Check if Telegram is configured
  if (!userSettings.telegramBotToken || !userSettings.telegramChatId || !userSettings.telegramNotificationsEnabled) {
    return { success: false, notifications: 0, error: 'Telegram not configured' };
  }

  try {
    // Get today's posts
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayPosts = postLogs.filter(log => {
      const logDate = format(new Date(log.timestampUTC), 'yyyy-MM-dd');
      return logDate === today;
    });

    // Call the API endpoint
    const response = await fetch('/api/check-and-notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        botToken: userSettings.telegramBotToken,
        chatId: userSettings.telegramChatId,
        accounts: accounts.map(acc => ({
          id: acc.id,
          platform: acc.platform,
          handle: acc.handle,
        })),
        todayPosts: todayPosts.map(post => ({
          accountId: post.accountId,
          timestampUTC: post.timestampUTC,
          skipped: post.skipped,
        })),
        userTimezone: userSettings.userTimezone,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, notifications: 0, error: error.error || 'API error' };
    }

    const result = await response.json();
    return {
      success: true,
      notifications: result.notificationsSent || 0,
    };
  } catch (error: any) {
    return { success: false, notifications: 0, error: error.message };
  }
}

// Auto-check notifications every 5 minutes when app is open
export function startNotificationChecker(
  getAccounts: () => PlatformAccount[],
  getPostLogs: () => PostLogEntry[],
  getUserSettings: () => UserSettings | null
) {
  const checkInterval = 5 * 60 * 1000; // 5 minutes

  const check = async () => {
    const settings = getUserSettings();
    if (!settings || !settings.telegramNotificationsEnabled) {
      return;
    }

    const accounts = getAccounts();
    const postLogs = getPostLogs();

    const result = await checkAndSendTelegramNotifications(accounts, postLogs, settings);
    
    if (result.success && result.notifications > 0) {
      console.log(`📱 Sent ${result.notifications} Telegram notification(s)`);
    }
  };

  // Check immediately
  check();

  // Then check every 5 minutes
  const interval = setInterval(check, checkInterval);

  // Return cleanup function
  return () => clearInterval(interval);
}

