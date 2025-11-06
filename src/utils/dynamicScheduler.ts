import { addMinutes, format, startOfDay } from 'date-fns';
import {
  Platform,
  PlatformAccount,
  PostLogEntry,
  Creator,
  UserSettings,
} from '../types';
import {
  PLATFORM_BASE_TIMES,
  COOLDOWN_MINUTES,
  US_TIMEZONE,
} from '../constants/platforms';
import {
  formatInTimezone,
} from './timezone';

export interface RecommendedPost {
  accountId: string;
  platform: Platform;
  recommendedTimeUTC: string;
  recommendedTimeCreatorTZ: string;
  recommendedTimeUserTZ: string;
  shift: 'morning' | 'evening';
  postNumber: number; // 1, 2, 3, etc. within the shift
  isReady: boolean; // Past recommended time
  isTooEarly: boolean;
  isPerfectTime: boolean;
  isTooLate: boolean;
  basedOnPreviousPost: boolean; // True if calculated from previous post, false if using base time
  minutesUntilRecommended: number; // Minutes until recommended time (negative if past)
  isDuringCooldown: boolean; // True if posting before cooldown period ends
  cooldownEndsInMinutes?: number; // Minutes until cooldown ends (if applicable)
}

/**
 * Get recommended next post for an account in a specific shift
 */
export function getNextRecommendedPost(
  account: PlatformAccount,
  _creator: Creator,
  userSettings: UserSettings,
  shift: 'morning' | 'evening',
  todayPosts: PostLogEntry[]
): RecommendedPost | null {
  const platform = account.platform;
  
  // Get all posts for this account today in this shift
  const accountPostsToday = todayPosts
    .filter(p => p.accountId === account.id)
    .sort((a, b) => a.timestampUTC.localeCompare(b.timestampUTC));
  
  // Separate by shift - Use USER's local time from the logged post, NOT UTC!
  const shiftPosts = accountPostsToday.filter(p => {
    // Use the timestampUserTZ which was logged at post time
    // Parse the user time string (e.g., "Nov 6, 3:43 PM")
    const userTimeStr = p.timestampUserTZ;
    const isPM = userTimeStr.includes('PM');
    const timeMatch = userTimeStr.match(/(\d+):(\d+)/);
    
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      
      // Determine shift based on USER's local time (same as component logic)
      const postShift = hour < 14 ? 'morning' : 'evening';
      return postShift === shift;
    }
    
    // Fallback to UTC if parsing fails
    const postTime = new Date(p.timestampUTC);
    const hour = postTime.getUTCHours();
    return shift === 'morning' ? hour < 14 : hour >= 14;
  });
  
  // Debug logging
  if (accountPostsToday.length > 0) {
    console.log(`📊 Scheduler for ${account.handle} (${platform}), ${shift} shift:`, {
      totalPostsToday: accountPostsToday.length,
      postsInThisShift: shiftPosts.length,
      maxPostsForShift: getMaxPostsForPlatformShift(platform, shift),
      nextPostNumber: shiftPosts.length + 1
    });
  }
  
  // Determine how many posts for this platform in this shift
  const maxPosts = getMaxPostsForPlatformShift(platform, shift);
  
  // If all posts done for this shift, return null
  if (shiftPosts.length >= maxPosts) {
    return null;
  }
  
  const postNumber = shiftPosts.length + 1;
  
  // Calculate recommended time
  let recommendedTimeUTC: string;
  let basedOnPreviousPost = false;
  let isDuringCooldown = false;
  let cooldownEndsInMinutes: number | undefined = undefined;
  
  if (shiftPosts.length === 0) {
    // First post of shift - use base time (always US timezone)
    recommendedTimeUTC = getBaseTimeForShift(platform, shift, US_TIMEZONE);
  } else {
    // Calculate from previous post + cooldown
    const lastPost = shiftPosts[shiftPosts.length - 1];
    const cooldown = COOLDOWN_MINUTES[platform];
    recommendedTimeUTC = addMinutesTime(lastPost.timestampUTC, cooldown);
    basedOnPreviousPost = true;
    
    // Check if we're still in cooldown period
    const now = new Date();
    const lastPostTime = new Date(lastPost.timestampUTC);
    const minutesSinceLastPost = Math.round((now.getTime() - lastPostTime.getTime()) / 1000 / 60);
    
    if (minutesSinceLastPost < cooldown) {
      isDuringCooldown = true;
      cooldownEndsInMinutes = cooldown - minutesSinceLastPost;
    }
  }
  
  // Check timing status
  const now = new Date();
  const recommendedDate = new Date(recommendedTimeUTC);
  const minutesUntilRecommended = Math.round((recommendedDate.getTime() - now.getTime()) / 1000 / 60);
  
  // Don't show if recommended time was more than 4 hours ago (240 minutes)
  if (minutesUntilRecommended < -240) {
    return null; // Too old, skip this recommendation
  }
  
  const isReady = minutesUntilRecommended <= 0; // Past recommended time
  const isTooEarly = minutesUntilRecommended > 15; // More than 15 min early
  const isPerfectTime = minutesUntilRecommended >= -15 && minutesUntilRecommended <= 15; // Within ±15 min
  const isTooLate = minutesUntilRecommended < -15; // More than 15 min late
  
  return {
    accountId: account.id,
    platform,
    recommendedTimeUTC,
    recommendedTimeCreatorTZ: formatInTimezone(recommendedTimeUTC, US_TIMEZONE, false), // Always US time
    recommendedTimeUserTZ: formatInTimezone(recommendedTimeUTC, userSettings.userTimezone, false),
    shift,
    postNumber,
    isReady,
    isTooEarly,
    isPerfectTime,
    isTooLate,
    basedOnPreviousPost,
    minutesUntilRecommended,
    isDuringCooldown,
    cooldownEndsInMinutes,
  };
}

/**
 * Get all recommended posts for today (across all accounts)
 */
export function getAllRecommendedPosts(
  accounts: PlatformAccount[],
  creators: Creator[],
  userSettings: UserSettings,
  todayPosts: PostLogEntry[]
): RecommendedPost[] {
  const recommendations: RecommendedPost[] = [];
  
  for (const account of accounts) {
    const creator = creators.find(c => c.id === account.creatorId);
    if (!creator) continue;
    
    // Get next post for morning shift
    const morningRec = getNextRecommendedPost(account, creator, userSettings, 'morning', todayPosts);
    if (morningRec) {
      recommendations.push(morningRec);
    }
    
    // Get next post for evening shift
    const eveningRec = getNextRecommendedPost(account, creator, userSettings, 'evening', todayPosts);
    if (eveningRec) {
      recommendations.push(eveningRec);
    }
  }
  
  // Sort by availability and time with special positioning for Instagram/Facebook
  // Morning: IG/FB right after first TikTok/Threads
  // Evening: IG/FB at the end after all TikTok/Threads
  recommendations.sort((a, b) => {
    // First priority: Not in cooldown (cooldown is the only real blocker)
    if (a.isDuringCooldown !== b.isDuringCooldown) {
      return a.isDuringCooldown ? 1 : -1; // Not in cooldown comes first
    }
    
    // Second priority: Shift separation (morning vs evening)
    if (a.shift !== b.shift) {
      return a.shift === 'morning' ? -1 : 1; // Morning first
    }
    
    // Third priority: Platform-based ordering within each shift
    const platformOrder = (rec: RecommendedPost): number => {
      if (rec.shift === 'morning') {
        // Morning: TikTok/Threads post 1, then IG/FB, then TikTok/Threads 2+
        if (rec.platform === 'tiktok' && rec.postNumber === 1) return 1;
        if (rec.platform === 'threads' && rec.postNumber === 1) return 2;
        if (rec.platform === 'instagram') return 3;
        if (rec.platform === 'facebook') return 4;
        if (rec.platform === 'tiktok') return 5;
        if (rec.platform === 'threads') return 6;
      } else {
        // Evening: TikTok/Threads first, then IG/FB at end
        if (rec.platform === 'tiktok') return 1;
        if (rec.platform === 'threads') return 2;
        if (rec.platform === 'instagram') return 3;
        if (rec.platform === 'facebook') return 4;
      }
      return 999;
    };
    
    const orderA = platformOrder(a);
    const orderB = platformOrder(b);
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Fourth priority: Post number within same platform
    if (a.platform === b.platform && a.postNumber !== b.postNumber) {
      return a.postNumber - b.postNumber;
    }
    
    // Final: Earliest recommended time
    return a.recommendedTimeUTC.localeCompare(b.recommendedTimeUTC);
  });
  
  return recommendations;
}

/**
 * Get the base time for a platform/shift combination
 */
function getBaseTimeForShift(
  platform: Platform,
  shift: 'morning' | 'evening',
  _creatorTimezone: string
): string {
  const now = new Date();
  let timeString: string;
  
  if (platform === 'tiktok') {
    // Use first morning or evening time from Bangkok base times
    timeString = shift === 'morning' 
      ? PLATFORM_BASE_TIMES.tiktok[0] // 05:00
      : PLATFORM_BASE_TIMES.tiktok[3]; // 16:00
    // Convert from Bangkok time to UTC
    const [hours, minutes] = timeString.split(':').map(Number);
    const bangkokTime = new Date(now);
    bangkokTime.setUTCHours(hours - 7, minutes, 0, 0); // Bangkok is UTC+7
    return bangkokTime.toISOString();
  } else if (platform === 'threads') {
    timeString = shift === 'morning'
      ? PLATFORM_BASE_TIMES.threads[0] // 05:10
      : PLATFORM_BASE_TIMES.threads[3]; // 16:10
    const [hours, minutes] = timeString.split(':').map(Number);
    const bangkokTime = new Date(now);
    bangkokTime.setUTCHours(hours - 7, minutes, 0, 0);
    return bangkokTime.toISOString();
  } else if (platform === 'instagram') {
    timeString = shift === 'morning'
      ? PLATFORM_BASE_TIMES.instagram.morning // 06:00
      : PLATFORM_BASE_TIMES.instagram.evening; // 16:00
    // Use creator timezone
    const [hours, minutes] = timeString.split(':').map(Number);
    const creatorTime = new Date(now);
    creatorTime.setHours(hours, minutes, 0, 0);
    return creatorTime.toISOString();
  } else { // facebook
    timeString = shift === 'morning'
      ? PLATFORM_BASE_TIMES.facebook.morning // 07:00
      : PLATFORM_BASE_TIMES.facebook.evening; // 17:00
    const [hours, minutes] = timeString.split(':').map(Number);
    const creatorTime = new Date(now);
    creatorTime.setHours(hours, minutes, 0, 0);
    return creatorTime.toISOString();
  }
}

/**
 * Add minutes to a UTC timestamp
 */
function addMinutesTime(utcTime: string, minutes: number): string {
  const date = new Date(utcTime);
  const newDate = addMinutes(date, minutes);
  return newDate.toISOString();
}


/**
 * Get today's posts for an account
 */
export function getTodayPostsForAccount(
  accountId: string,
  allPosts: PostLogEntry[]
): PostLogEntry[] {
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
  
  return allPosts.filter(p => {
    if (p.accountId !== accountId) return false;
    const postDate = format(startOfDay(new Date(p.timestampUTC)), 'yyyy-MM-dd');
    return postDate === today;
  });
}

/**
 * Get max posts for a platform in a specific shift
 */
export function getMaxPostsForPlatformShift(platform: Platform, _shift: 'morning' | 'evening'): number {
  if (platform === 'tiktok' || platform === 'threads') {
    return 3; // 3 posts per shift
  } else if (platform === 'instagram' || platform === 'facebook') {
    return 1; // 1 post per shift (FB can be 2)
  }
  return 1;
}

