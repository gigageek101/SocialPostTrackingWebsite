import { Platform, PlatformChecklistTemplate } from '../types';

// Bangkok timezone base times (UTC+7)
export const BANGKOK_TIMEZONE = 'Asia/Bangkok';
export const DEFAULT_CREATOR_TIMEZONE = 'America/Chicago'; // US Central Time
export const US_TIMEZONE = 'America/Chicago'; // All creators use US time

export const PLATFORM_BASE_TIMES = {
  tiktok: ['05:00', '10:00', '19:00', '19:30'], // 5AM, 10AM, 7PM, 7PM (optional 4th post)
  threads: ['07:30', '10:00', '13:00', '16:00', '19:00', '20:30'], // 7:30AM, 10AM, 1PM, 4PM, 7PM, 8:30PM
  instagram: ['08:00', '20:00'], // Morning: 8am | Evening: 8pm (US time)
  facebook: {
    morning: '10:00', // Kept for backwards compatibility (not used in schedule)
    evening: '19:00', // Kept for backwards compatibility (not used in schedule)
  },
};

export const COOLDOWN_MINUTES: Record<Platform, number> = {
  tiktok: 120, // 2 hours
  threads: 120, // 2 hours
  instagram: 0, // No cooldown
  facebook: 0, // No cooldown
};

export const STAGGER_INTERVAL_MINUTES = 10;

export const PLATFORM_COLORS: Record<Platform, string> = {
  tiktok: 'bg-black text-white',
  threads: 'bg-black text-white',
  instagram: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white',
  facebook: 'bg-blue-600 text-white',
};

export const PLATFORM_NAMES: Record<Platform, string> = {
  tiktok: 'TikTok',
  threads: 'Threads',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

export const CHECKLIST_TEMPLATES: PlatformChecklistTemplate[] = [
  {
    platform: 'tiktok',
    recommendedProtocol: 'Perfect TikTok Engagement Method',
    items: [
      {
        id: 'tiktok-dms',
        label: 'Send 10 DMs funneling to IG (all different)',
        type: 'counter',
        count: 10,
        recommendedCount: 10,
      },
      {
        id: 'tiktok-likes',
        label: 'Like 5 posts',
        type: 'counter',
        count: 5,
        recommendedCount: 5,
      },
      {
        id: 'tiktok-comments',
        label: 'Comment on 2 creators',
        type: 'counter',
        count: 2,
        recommendedCount: 2,
      },
      {
        id: 'tiktok-answer',
        label: 'Answer comments older than 24h',
        type: 'toggle',
      },
      {
        id: 'tiktok-stories',
        label: 'View stories of target audience',
        type: 'toggle',
      },
      {
        id: 'tiktok-homefeed',
        label: 'Scroll homefeed for 3 minutes (like & save content)',
        type: 'toggle',
      },
    ],
  },
  {
    platform: 'threads',
    recommendedProtocol: 'Perfect Threads Engagement Method',
    items: [
      {
        id: 'threads-text-comments',
        label: '3 text comments',
        type: 'counter',
        count: 3,
        recommendedCount: 3,
      },
      {
        id: 'threads-picture-comments',
        label: '3 picture comments under viral posts',
        type: 'counter',
        count: 3,
        recommendedCount: 3,
      },
      {
        id: 'threads-likes',
        label: '3 likes of comments',
        type: 'counter',
        count: 3,
        recommendedCount: 3,
      },
      {
        id: 'threads-homefeed',
        label: 'Scroll homefeed for 3 minutes (like & save content)',
        type: 'toggle',
      },
    ],
  },
  {
    platform: 'instagram',
    recommendedProtocol: 'Perfect Instagram Method',
    items: [
      {
        id: 'ig-story',
        label: 'Post 1 story',
        type: 'toggle',
      },
      {
        id: 'ig-like-back',
        label: 'Like back 10 likers from your post',
        type: 'counter',
        count: 10,
        recommendedCount: 10,
      },
      {
        id: 'ig-story-views',
        label: 'View 20 stories',
        type: 'counter',
        count: 20,
        recommendedCount: 20,
      },
      {
        id: 'ig-engage-followers-post-likes',
        label: 'Like 30 posts from followers',
        type: 'counter',
        count: 30,
        recommendedCount: 30,
      },
      {
        id: 'ig-engage-followers-story-views',
        label: 'View 30 follower stories',
        type: 'counter',
        count: 30,
        recommendedCount: 30,
      },
      {
        id: 'ig-engage-followers-story-likes',
        label: 'Like 10 follower stories',
        type: 'counter',
        count: 10,
        recommendedCount: 10,
      },
      {
        id: 'ig-homefeed',
        label: 'Scroll homefeed for 3 minutes (like & save content)',
        type: 'toggle',
      },
    ],
  },
  {
    platform: 'facebook',
    recommendedProtocol: 'Perfect Facebook Method',
    items: [
      {
        id: 'fb-likes',
        label: 'Like 10 posts from target users',
        type: 'counter',
        count: 10,
        recommendedCount: 10,
      },
      {
        id: 'fb-homefeed',
        label: 'Scroll homefeed for 3 minutes (like & save content)',
        type: 'toggle',
      },
    ],
  },
];

