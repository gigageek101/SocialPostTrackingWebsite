// Platform types
export type Platform = 'tiktok' | 'threads' | 'instagram' | 'facebook';

export type PostStatus = 'pending' | 'posted' | 'cooldown' | 'skipped';

// User Settings
export interface UserSettings {
  id: string;
  userTimezone: string;
  notificationsEnabled: boolean;
  hideTimesPopup: boolean;
  createdAt: string;
}

// Creator
export interface Creator {
  id: string;
  name: string;
  timezone: string; // Default: America/Chicago
  createdAt: string;
}

// Platform Account
export interface PlatformAccount {
  id: string;
  creatorId: string;
  platform: Platform;
  handle: string;
  profileLink?: string;
  overrides?: PlatformOverrides;
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
  timestampUTC: string;
  timestampCreatorTZ: string;
  timestampUserTZ: string;
  checklistState: ChecklistState;
  notes: string;
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
export interface AppState {
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
  | 'onboarding'
  | 'schedule-overview'
  | 'calendar'
  | 'creators'
  | 'settings';

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

