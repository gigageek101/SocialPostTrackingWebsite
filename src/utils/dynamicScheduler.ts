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
  alreadyCompleted?: boolean; // True if this post was already made (for checklist view)
  skipped?: boolean; // True if this post was skipped
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
    .filter(p => p.accountId === account.id && !p.skipped)
    .sort((a, b) => a.timestampUTC.localeCompare(b.timestampUTC));
  
  // Separate by shift - Convert UTC to user's timezone
  const shiftPosts = accountPostsToday.filter(p => {
    // Convert UTC timestamp to hour in user's timezone
    const postDate = new Date(p.timestampUTC);
    const hourInUserTZ = parseInt(
      postDate.toLocaleString('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: userSettings.userTimezone,
      })
    );
    
    // Determine shift: morning < 12, evening >= 12
    const postShift = hourInUserTZ < 12 ? 'morning' : 'evening';
    return postShift === shift;
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
  
  // Use the exact scheduled time based on post number, not cooldown calculation
  const scheduledTime = getScheduledTimeForPost(platform, shift, postNumber);
  console.log(`📅 ${platform} ${shift} Post ${postNumber} → Scheduled Time: ${scheduledTime}`);
  
  if (scheduledTime) {
    recommendedTimeUTC = createUTCTimestampForBangkokTime(scheduledTime);
    basedOnPreviousPost = false;
  } else {
    // Fallback: use first post + cooldown if no specific time defined
    if (shiftPosts.length === 0) {
      recommendedTimeUTC = getBaseTimeForShift(platform, shift, US_TIMEZONE);
    } else {
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
  }
  
  // Check timing status - work in UTC for now (simpler and reliable)
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
 * Get all recommended posts for today (across all accounts) - JUST THE NEXT ONE PER ACCOUNT/SHIFT
 * Used for the old "one at a time" view
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
        // Morning: Complete ALL TikTok posts first, then IG/FB, then ALL Threads posts
        if (rec.platform === 'tiktok') return 1; // All TikTok posts (1, 2, 3)
        if (rec.platform === 'instagram') return 2;
        if (rec.platform === 'facebook') return 3;
        if (rec.platform === 'threads') return 4; // All Threads posts (1, 2, 3)
      } else {
        // Evening: ALL TikTok first, ALL Threads, then IG/FB at end
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
 * Get ALL recommended posts for a specific shift (ALL posts, not just the next one)
 * This shows the full checklist of posts for the shift
 */
export function getAllPostsForShift(
  accounts: PlatformAccount[],
  creators: Creator[],
  userSettings: UserSettings,
  shift: 'morning' | 'evening',
  todayPosts: PostLogEntry[]
): RecommendedPost[] {
  const recommendations: RecommendedPost[] = [];
  
  for (const account of accounts) {
    const creator = creators.find(c => c.id === account.creatorId);
    if (!creator) continue;
    
    // Get ALL posts for this account in this shift
    const maxPosts = getMaxPostsForPlatformShift(account.platform, shift);
    
    // Get all posts made for this account today (including skipped)
    const accountPostsToday = todayPosts
      .filter(p => p.accountId === account.id)
      .sort((a, b) => a.timestampUTC.localeCompare(b.timestampUTC));
    
    // Separate completed from skipped
    const completedPosts = accountPostsToday.filter(p => !p.skipped);
    const skippedPosts = accountPostsToday.filter(p => p.skipped);
    
    const shiftCompletedPosts = completedPosts.filter(p => {
      const postDate = new Date(p.timestampUTC);
      const hourInUserTZ = parseInt(
        postDate.toLocaleString('en-US', {
          hour: 'numeric',
          hour12: false,
          timeZone: userSettings.userTimezone,
        })
      );
      const postShift = hourInUserTZ < 12 ? 'morning' : 'evening';
      return postShift === shift;
    });
    
    const shiftSkippedPosts = skippedPosts.filter(p => {
      const postDate = new Date(p.timestampUTC);
      const hourInUserTZ = parseInt(
        postDate.toLocaleString('en-US', {
          hour: 'numeric',
          hour12: false,
          timeZone: userSettings.userTimezone,
        })
      );
      const postShift = hourInUserTZ < 12 ? 'morning' : 'evening';
      return postShift === shift;
    });
    
    // Generate recommendations for ALL posts (including already completed/skipped)
    for (let postNum = 1; postNum <= maxPosts; postNum++) {
      // Check if this post was completed (match by postNumber, not index!)
      const existingPost = shiftCompletedPosts.find(p => p.postNumber === postNum);
      // Check if this post was skipped (match by postNumber, not index!)
      const wasSkipped = shiftSkippedPosts.some(p => p.postNumber === postNum);
      
      if (existingPost) {
        // This post was already made - mark as completed
        recommendations.push({
          accountId: account.id,
          platform: account.platform,
          recommendedTimeUTC: existingPost.timestampUTC,
          recommendedTimeCreatorTZ: existingPost.timestampCreatorTZ,
          recommendedTimeUserTZ: existingPost.timestampUserTZ,
          shift,
          postNumber: postNum,
          isReady: true,
          isTooEarly: false,
          isPerfectTime: false,
          isTooLate: false,
          basedOnPreviousPost: postNum > 1,
          minutesUntilRecommended: 0,
          isDuringCooldown: false,
          alreadyCompleted: true,
          skipped: false,
        });
      } else if (wasSkipped) {
        // This post was skipped (match by postNumber!)
        const skippedPost = shiftSkippedPosts.find(p => p.postNumber === postNum);
        if (skippedPost) {
          recommendations.push({
            accountId: account.id,
            platform: account.platform,
            recommendedTimeUTC: skippedPost.timestampUTC,
            recommendedTimeCreatorTZ: skippedPost.timestampCreatorTZ,
            recommendedTimeUserTZ: skippedPost.timestampUserTZ,
            shift,
            postNumber: postNum,
            isReady: true,
            isTooEarly: false,
            isPerfectTime: false,
            isTooLate: false,
            basedOnPreviousPost: postNum > 1,
            minutesUntilRecommended: 0,
            isDuringCooldown: false,
            alreadyCompleted: false,
            skipped: true,
          });
        }
      } else {
        // This post is pending - calculate recommendation
        const rec = calculateRecommendationForPost(
          account,
          userSettings,
          shift,
          postNum,
          shiftCompletedPosts
        );
        if (rec) {
          recommendations.push({
            ...rec,
            alreadyCompleted: false,
            skipped: false,
          });
        }
      }
    }
  }
  
  // Sort by workflow order
  recommendations.sort((a, b) => {
    // All items in this function should be from the same shift, but let's be safe
    const shift = a.shift;
    
    // Helper to get account index within platform
    const getAccountIndex = (accountId: string, platform: Platform) => {
      const platformAccounts = accounts.filter(acc => acc.platform === platform);
      return platformAccounts.findIndex(acc => acc.id === accountId);
    };
    
    if (shift === 'morning') {
      // Morning shift order:
      // TikTok Account 1 Post1, TikTok Account 2 Post1, Threads Account 1 Post1, Threads Account 2 Post1, Instagram Post1, Facebook Post1,
      // TikTok Account 1 Post2, TikTok Account 2 Post2, Threads Account 1 Post2, Threads Account 2 Post2,
      // TikTok Account 1 Post3, TikTok Account 2 Post3, Threads Account 1 Post3, Threads Account 2 Post3
      
      // First sort by post number
      if (a.postNumber !== b.postNumber) {
        return a.postNumber - b.postNumber;
      }
      
      // Then by platform order (TikTok, Threads, Instagram, Facebook)
      const platformOrder = (platform: string) => {
        if (platform === 'tiktok') return 1;
        if (platform === 'threads') return 2;
        if (platform === 'instagram') return 3;
        if (platform === 'facebook') return 4;
        return 999;
      };
      
      const platformDiff = platformOrder(a.platform) - platformOrder(b.platform);
      if (platformDiff !== 0) {
        return platformDiff;
      }
      
      // Then by account index (Account 1 before Account 2)
      return getAccountIndex(a.accountId, a.platform) - getAccountIndex(b.accountId, b.platform);
    } else {
      // Evening shift order:
      // TikTok Account 1 Post1, TikTok Account 2 Post1, Threads Account 1 Post1, Threads Account 2 Post1,
      // TikTok Account 1 Post2, TikTok Account 2 Post2, Threads Account 1 Post2, Threads Account 2 Post2,
      // TikTok Account 1 Post3, TikTok Account 2 Post3, Threads Account 1 Post3, Threads Account 2 Post3,
      // Instagram Post1, Facebook Post1
      
      // Instagram and Facebook go to the end
      const isASpecial = a.platform === 'instagram' || a.platform === 'facebook';
      const isBSpecial = b.platform === 'instagram' || b.platform === 'facebook';
      
      if (isASpecial && !isBSpecial) return 1;
      if (!isASpecial && isBSpecial) return -1;
      
      // For TikTok/Threads OR for Instagram/Facebook, sort by post number first
      if (a.postNumber !== b.postNumber) {
        return a.postNumber - b.postNumber;
      }
      
      // Then by platform order
      const platformOrder = (platform: string) => {
        if (platform === 'tiktok') return 1;
        if (platform === 'threads') return 2;
        if (platform === 'instagram') return 3;
        if (platform === 'facebook') return 4;
        return 999;
      };
      
      const platformDiff = platformOrder(a.platform) - platformOrder(b.platform);
      if (platformDiff !== 0) {
        return platformDiff;
      }
      
      // Then by account index (Account 1 before Account 2)
      return getAccountIndex(a.accountId, a.platform) - getAccountIndex(b.accountId, b.platform);
    }
  });
  
  return recommendations;
}

/**
 * Calculate recommendation for a specific post number
 */
function calculateRecommendationForPost(
  account: PlatformAccount,
  userSettings: UserSettings,
  shift: 'morning' | 'evening',
  postNumber: number,
  shiftPosts: PostLogEntry[]
): RecommendedPost | null {
  const platform = account.platform;
  
  // Calculate recommended time
  let recommendedTimeUTC: string;
  let basedOnPreviousPost = false;
  let isDuringCooldown = false;
  let cooldownEndsInMinutes: number | undefined = undefined;
  
  if (postNumber === 1) {
    // First post of shift - use base time
    recommendedTimeUTC = getBaseTimeForShift(platform, shift, US_TIMEZONE);
  } else {
    // Calculate from previous post + cooldown
    const previousPostIndex = postNumber - 2; // 0-indexed
    if (previousPostIndex >= shiftPosts.length) {
      // Previous post hasn't been made yet - calculate from base time
      recommendedTimeUTC = getBaseTimeForShift(platform, shift, US_TIMEZONE);
      const cooldown = COOLDOWN_MINUTES[platform];
      recommendedTimeUTC = addMinutesTime(recommendedTimeUTC, cooldown * (postNumber - 1));
    } else {
      const previousPost = shiftPosts[previousPostIndex];
      const cooldown = COOLDOWN_MINUTES[platform];
      recommendedTimeUTC = addMinutesTime(previousPost.timestampUTC, cooldown);
      basedOnPreviousPost = true;
      
      // Check if we're still in cooldown period
      const now = new Date();
      const previousPostTime = new Date(previousPost.timestampUTC);
      const minutesSincePreviousPost = Math.round((now.getTime() - previousPostTime.getTime()) / 1000 / 60);
      
      if (minutesSincePreviousPost < cooldown) {
        isDuringCooldown = true;
        cooldownEndsInMinutes = cooldown - minutesSincePreviousPost;
      }
    }
  }
  
  // Check timing status - work in UTC for now (simpler and reliable)
  const now = new Date();
  const recommendedDate = new Date(recommendedTimeUTC);
  const minutesUntilRecommended = Math.round((recommendedDate.getTime() - now.getTime()) / 1000 / 60);
  
  const isReady = minutesUntilRecommended <= 0;
  const isTooEarly = minutesUntilRecommended > 15;
  const isPerfectTime = minutesUntilRecommended >= -15 && minutesUntilRecommended <= 15;
  const isTooLate = minutesUntilRecommended < -15;
  
  return {
    accountId: account.id,
    platform,
    recommendedTimeUTC,
    recommendedTimeCreatorTZ: formatInTimezone(recommendedTimeUTC, US_TIMEZONE, false),
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
 * Get the scheduled time for a specific post number
 * Returns the exact time from PLATFORM_BASE_TIMES array
 */
function getScheduledTimeForPost(platform: Platform, shift: 'morning' | 'evening', postNumber: number): string | null {
  const times = PLATFORM_BASE_TIMES[platform];
  if (!times || typeof times !== 'object' || Array.isArray(times) === false) {
    return null;
  }
  
  if (shift === 'morning') {
    // Morning posts use the first half of the array
    const index = postNumber - 1;
    return (times as string[])[index] || null;
  } else {
    // Evening posts use the second half
    const morningPostCount = getMaxPostsForPlatformShift(platform, 'morning');
    const index = morningPostCount + (postNumber - 1);
    return (times as string[])[index] || null;
  }
}

/**
 * Create a UTC timestamp for a Bangkok time today
 * Use date-fns-tz for reliable timezone conversion
 */
function createUTCTimestampForBangkokTime(bangkokTimeStr: string): string {
  const [hours, minutes] = bangkokTimeStr.split(':').map(Number);
  
  // Get current date in Bangkok timezone
  const now = new Date();
  const bangkokFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = bangkokFormatter.formatToParts(now);
  const yearStr = parts.find(p => p.type === 'year')?.value || now.getFullYear().toString();
  const monthStr = parts.find(p => p.type === 'month')?.value || '01';
  const dayStr = parts.find(p => p.type === 'day')?.value || '01';
  
  // Construct ISO string with +07:00 offset (Bangkok timezone)
  const bangkokISO = `${yearStr}-${monthStr}-${dayStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000+07:00`;
  const utcDate = new Date(bangkokISO);
  
  console.log(`🕐 Bangkok ${bangkokTimeStr} → ISO: ${bangkokISO} → UTC: ${utcDate.toISOString()}`);
  
  return utcDate.toISOString();
}

/**
 * Get the base time for a platform/shift combination (returns Bangkok time string)
 */
function getBaseTimeForShift(
  platform: Platform,
  shift: 'morning' | 'evening',
  _creatorTimezone: string
): string {
  let timeString: string;
  
  if (platform === 'tiktok') {
    timeString = shift === 'morning' 
      ? PLATFORM_BASE_TIMES.tiktok[0] // 05:45
      : PLATFORM_BASE_TIMES.tiktok[2]; // 19:00
  } else if (platform === 'threads') {
    timeString = shift === 'morning'
      ? PLATFORM_BASE_TIMES.threads[0] // 07:30
      : PLATFORM_BASE_TIMES.threads[2]; // 13:00
  } else if (platform === 'instagram') {
    timeString = shift === 'morning'
      ? PLATFORM_BASE_TIMES.instagram[0] // 08:00
      : PLATFORM_BASE_TIMES.instagram[1]; // 20:00
  } else { // facebook
    timeString = shift === 'morning'
      ? PLATFORM_BASE_TIMES.facebook.morning // 10:00
      : PLATFORM_BASE_TIMES.facebook.evening; // 19:00
  }
  
  // Convert Bangkok time to UTC timestamp for storage
  return createUTCTimestampForBangkokTime(timeString);
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
export function getMaxPostsForPlatformShift(platform: Platform, shift: 'morning' | 'evening'): number {
  if (platform === 'tiktok') {
    // TikTok: 2 morning, 2 evening (4 total)
    // ['05:45', '10:00', '19:00', '19:30']
    return 2;
  } else if (platform === 'threads') {
    // Threads: 2 morning (07:30, 10:00), 4 evening (13:00, 16:00, 19:00, 20:30)
    // ['07:30', '10:00', '13:00', '16:00', '19:00', '20:30']
    return shift === 'morning' ? 2 : 4;
  } else if (platform === 'instagram') {
    return 1; // 1 post per shift (2 total per day)
  } else if (platform === 'facebook') {
    return 0; // Facebook removed from scheduling
  }
  return 1;
}

