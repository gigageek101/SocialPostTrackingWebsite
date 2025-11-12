// Platform types
export type Platform = 'tiktok' | 'threads' | 'instagram' | 'facebook';

export type PostStatus = 'pending' | 'posted' | 'cooldown' | 'skipped';

// Platform Schedule Settings
export interface PlatformScheduleSettings {
  times: string[]; // Array of posting times in HH:MM format (Bangkok time)
  cooldown: number; // Cooldown in minutes
}

export interface ScheduleSettings {
  tiktok: PlatformScheduleSettings;
  threads: PlatformScheduleSettings;
  instagram: PlatformScheduleSettings;
  facebook: PlatformScheduleSettings;
}

// User Settings
export interface UserSettings {
  id: string;
  userTimezone: string;
  notificationsEnabled: boolean;
  hideTimesPopup: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramNotificationsEnabled?: boolean;
  scheduleSettings?: ScheduleSettings; // Custom schedule settings (overrides defaults)
  createdAt: string;
}

// Creator
export interface Creator {
  id: string;
  username: string; // Required for Supabase
  name: string;
  timezone: string; // Default: America/Chicago
  profilePicture?: string; // Base64 encoded image
  telegramBotToken?: string; // Telegram bot token for notifications
  telegramChatId?: string; // Telegram chat ID for notifications
  createdAt: string;
}

// Platform Account
export interface PlatformAccount {
  id: string;
  creatorId: string;
  platform: Platform;
  handle: string;
  device: string; // Which device/phone this account is on
  profileLink?: string;
  telegramLink?: string; // Telegram channel/group for this account's posts
  captions?: Caption[]; // Pre-written captions for this account
  overrides?: PlatformOverrides;
  createdAt: string;
}

// Caption for posts
export interface Caption {
  id: string;
  slides: string[]; // Array of slide texts
  title: string;
  hashtags: string;
  used: boolean; // Track if caption has been used
  createdAt: string;
}

// Platform-specific overrides
export interface PlatformOverrides {
  postsPerDay?: number;
  customTimes?: string[];
  interactionLimits?: Record<string, number>;
}

// Base times in Bangkok timezone (UTC+7)
export interface PlatformBaseTimes {
  tiktok: string[]; // 05:00, 07:00, 09:00, 16:00, 18:00, 20:00
  threads: string[]; // 05:10, 07:10, 09:10, 16:10, 18:10, 20:10
  instagram: { morning: string; evening: string }; // In creator TZ
  facebook: { morning: string; evening: string }; // Flexible, but can be staggered
}

// Daily Plan Slot
export interface DailyPlanSlot {
  id: string;
  accountId: string;
  platform: Platform;
  scheduledTimeUTC: string;
  scheduledTimeCreatorTZ: string;
  scheduledTimeUserTZ: string;
  status: PostStatus;
  postLogId?: string;
  nextEligibleTimeUTC?: string; // For cooldown tracking
}

// Daily Plan
export interface DailyPlan {
  id: string;
  date: string; // YYYY-MM-DD
  slots: DailyPlanSlot[];
  createdAt: string;
}

// Post Log Entry
export interface PostLogEntry {
  id: string;
  slotId?: string; // Optional for unscheduled posts
  accountId: string;
  platform: Platform;
  postNumber?: number; // Which post number this is (1, 2, 3, etc.) - for dynamic scheduling
  postLink?: string; // Link to the actual post
  timestampUTC: string;
  timestampCreatorTZ: string;
  timestampUserTZ: string;
  checklistState: ChecklistState;
  notes: string;
  captionId?: string; // Caption used for this post (TikTok only)
  skipped?: boolean; // True if post was skipped (no cooldown applied)
  createdAt: string;
}

// Checklist State
export interface ChecklistState {
  platform: Platform;
  items: ChecklistItem[];
  modified: boolean; // True if user changed from recommended
}

// Checklist Item
export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  type: 'toggle' | 'counter';
  count?: number; // For counter type
  recommendedCount?: number; // For counter type
}

// Platform Checklist Templates
export interface PlatformChecklistTemplate {
  platform: Platform;
  items: Omit<ChecklistItem, 'completed'>[];
  recommendedProtocol: string;
}

// App State
// Auth State
export interface AuthState {
  isAuthenticated: boolean;
  currentCreatorId: string | null;
  currentUsername: string | null;
}

export interface AppState {
  authState: AuthState;
  userSettings: UserSettings | null;
  creators: Creator[];
  accounts: PlatformAccount[];
  dailyPlans: DailyPlan[];
  postLogs: PostLogEntry[];
  checklistTemplates: PlatformChecklistTemplate[];
  lastSync: string;
}

// Navigation
export type Screen = 
  | 'auth'
  | 'onboarding'
  | 'schedule-overview'
  | 'scheduled-posts'
  | 'schedule-settings'
  | 'content'
  | 'workflow'
  | 'schedule-history'
  | 'creators'
  | 'creator-settings'
  | 'settings'
  | 'statistics';

// Notification
export interface AppNotification {
  id: string;
  accountId: string;
  slotId: string;
  platform: Platform;
  message: string;
  scheduledFor: string;
  sent: boolean;
}

