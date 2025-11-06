// Track which notifications have been sent to avoid duplicates
// This prevents spamming the user with the same notification multiple times

const sentNotifications = new Set<string>();

export function hasNotificationBeenSent(key: string): boolean {
  return sentNotifications.has(key);
}

export function markNotificationAsSent(key: string): void {
  sentNotifications.add(key);
}

export function clearOldNotifications(): void {
  // Clear notifications older than 24 hours
  // Since we use date-based keys, we can safely clear the entire set daily
  sentNotifications.clear();
}

// Generate unique key for notifications
export function generateNotificationKey(
  type: 'post-ready' | 'post-completed',
  accountId: string,
  shift: 'morning' | 'evening',
  postNumber: number,
  date: string
): string {
  return `${type}:${accountId}:${shift}:${postNumber}:${date}`;
}

