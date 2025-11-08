import { format, startOfDay } from 'date-fns';
import {
  Platform,
  PlatformAccount,
  DailyPlanSlot,
  PostStatus,
  Creator,
  UserSettings,
  PostLogEntry,
} from '../types';
import {
  PLATFORM_BASE_TIMES,
  BANGKOK_TIMEZONE,
  STAGGER_INTERVAL_MINUTES,
  COOLDOWN_MINUTES,
} from '../constants/platforms';
import {
  timeToUTC,
  formatInTimezone,
  addMinutesToUTC,
  getMinutesUntil,
  isBeforeNow,
} from './timezone';
import { generateId } from './helpers';

interface ScheduleEntry {
  accountId: string;
  platform: Platform;
  baseTime: string; // HH:mm
  timezone: string;
  accountIndex: number;
}

/**
 * Generate daily plan slots for all accounts with staggering applied
 */
export function generateDailyPlan(
  accounts: PlatformAccount[],
  creators: Creator[],
  userSettings: UserSettings,
  targetDate: Date = new Date(),
  previousPosts: PostLogEntry[] = []
): DailyPlanSlot[] {
  const slots: DailyPlanSlot[] = [];
  const scheduleEntries: ScheduleEntry[] = [];

  // Build schedule entries for all accounts
  accounts.forEach((account, accountIndex) => {
    const creator = creators.find((c) => c.id === account.creatorId);
    if (!creator) return;

    const platform = account.platform;

    if (platform === 'tiktok') {
      PLATFORM_BASE_TIMES.tiktok.forEach((time) => {
        scheduleEntries.push({
          accountId: account.id,
          platform,
          baseTime: time,
          timezone: BANGKOK_TIMEZONE,
          accountIndex,
        });
      });
    } else if (platform === 'threads') {
      PLATFORM_BASE_TIMES.threads.forEach((time) => {
        scheduleEntries.push({
          accountId: account.id,
          platform,
          baseTime: time,
          timezone: BANGKOK_TIMEZONE,
          accountIndex,
        });
      });
    } else if (platform === 'instagram') {
      // Instagram now has 4 posts: 2 morning + 2 evening
      PLATFORM_BASE_TIMES.instagram.forEach((baseTime) => {
        scheduleEntries.push({
          accountId: account.id,
          platform,
          baseTime,
          timezone: creator.timezone,
          accountIndex,
        });
      });
    } else if (platform === 'facebook') {
      // Morning and evening in creator timezone (flexible)
      scheduleEntries.push({
        accountId: account.id,
        platform,
        baseTime: PLATFORM_BASE_TIMES.facebook.morning,
        timezone: creator.timezone,
        accountIndex,
      });
      scheduleEntries.push({
        accountId: account.id,
        platform,
        baseTime: PLATFORM_BASE_TIMES.facebook.evening,
        timezone: creator.timezone,
        accountIndex,
      });
    }
  });

  // Sort by workflow: TikTok accounts first, then Threads, then IG, then FB
  // Within each platform, sort by account index, then by time
  const platformOrder = { tiktok: 1, threads: 2, instagram: 3, facebook: 4 };
  
  scheduleEntries.sort((a, b) => {
    // First by time slot
    const timeCompare = a.baseTime.localeCompare(b.baseTime);
    if (timeCompare !== 0) return timeCompare;
    
    // Then by platform order (TikTok -> Threads -> IG -> FB)
    const platformCompare = platformOrder[a.platform] - platformOrder[b.platform];
    if (platformCompare !== 0) return platformCompare;
    
    // Then by account index within platform
    return a.accountIndex - b.accountIndex;
  });

  // Group by base time and apply staggering
  const timeGroups = new Map<string, ScheduleEntry[]>();
  scheduleEntries.forEach((entry) => {
    const key = entry.baseTime;
    if (!timeGroups.has(key)) {
      timeGroups.set(key, []);
    }
    timeGroups.get(key)!.push(entry);
  });

  // Apply staggering within each time group
  timeGroups.forEach((entries) => {
    entries.forEach((entry, index) => {
      const staggerMinutes = index * STAGGER_INTERVAL_MINUTES;
      const baseUTC = timeToUTC(entry.baseTime, entry.timezone, targetDate);
      const scheduledTimeUTC = addMinutesToUTC(baseUTC, staggerMinutes);

      const creator = creators.find(
        (c) => c.id === accounts.find((a) => a.id === entry.accountId)?.creatorId
      );

      // Determine initial status
      let status: PostStatus = 'pending';
      let nextEligibleTimeUTC: string | undefined = undefined;

      // Check if there's a recent post for this account
      const recentPost = previousPosts
        .filter((p) => p.accountId === entry.accountId)
        .sort((a, b) => b.timestampUTC.localeCompare(a.timestampUTC))[0];

      if (recentPost) {
        const cooldownMinutes = COOLDOWN_MINUTES[entry.platform];
        if (cooldownMinutes > 0) {
          const cooldownEndTime = addMinutesToUTC(
            recentPost.timestampUTC,
            cooldownMinutes
          );
          if (isBeforeNow(cooldownEndTime)) {
            status = 'cooldown';
            nextEligibleTimeUTC = cooldownEndTime;
          }
        }
      }

      // Check if slot time has passed
      if (isBeforeNow(scheduledTimeUTC) && status === 'pending') {
        // Don't auto-skip, let user decide
      }

      slots.push({
        id: generateId(),
        accountId: entry.accountId,
        platform: entry.platform,
        scheduledTimeUTC,
        scheduledTimeCreatorTZ: formatInTimezone(
          scheduledTimeUTC,
          creator?.timezone || 'America/Chicago',
          false
        ),
        scheduledTimeUserTZ: formatInTimezone(
          scheduledTimeUTC,
          userSettings.userTimezone,
          false
        ),
        status,
        nextEligibleTimeUTC,
      });
    });
  });

  // Sort by scheduled time
  slots.sort((a, b) => a.scheduledTimeUTC.localeCompare(b.scheduledTimeUTC));

  return slots;
}

/**
 * Check if a slot is currently actionable (ready to post)
 */
export function isSlotActionable(
  slot: DailyPlanSlot,
  postLogs: PostLogEntry[]
): boolean {
  // Must be in pending status
  if (slot.status !== 'pending') return false;

  // Must be at or after scheduled time
  if (!isBeforeNow(slot.scheduledTimeUTC)) return true;

  // Check cooldown for platforms that require it
  const cooldownMinutes = COOLDOWN_MINUTES[slot.platform];
  if (cooldownMinutes === 0) return true;

  // Find most recent post for this account
  const recentPost = postLogs
    .filter((p) => p.accountId === slot.accountId)
    .sort((a, b) => b.timestampUTC.localeCompare(a.timestampUTC))[0];

  if (!recentPost) return true;

  // Check if cooldown period has passed
  const minutesSincePost = getMinutesUntil(recentPost.timestampUTC);
  return Math.abs(minutesSincePost) >= cooldownMinutes;
}

/**
 * Get next eligible time for an account (considering cooldown)
 */
export function getNextEligibleTime(
  accountId: string,
  platform: Platform,
  postLogs: PostLogEntry[]
): string | null {
  const cooldownMinutes = COOLDOWN_MINUTES[platform];
  if (cooldownMinutes === 0) return null;

  const recentPost = postLogs
    .filter((p) => p.accountId === accountId)
    .sort((a, b) => b.timestampUTC.localeCompare(a.timestampUTC))[0];

  if (!recentPost) return null;

  const nextEligibleTime = addMinutesToUTC(
    recentPost.timestampUTC,
    cooldownMinutes
  );

  // If cooldown has passed, return null
  if (isBeforeNow(nextEligibleTime)) return null;

  return nextEligibleTime;
}

/**
 * Get today's date key for daily plans (YYYY-MM-DD)
 */
export function getTodayKey(): string {
  return format(startOfDay(new Date()), 'yyyy-MM-dd');
}

