import { Platform, PlatformChecklistTemplate } from '../types';

// Bangkok timezone base times (UTC+7)
export const BANGKOK_TIMEZONE = 'Asia/Bangkok';
export const DEFAULT_CREATOR_TIMEZONE = 'America/Chicago';

export const PLATFORM_BASE_TIMES = {
  tiktok: ['05:00', '07:00', '09:00', '16:00', '18:00', '20:00'],
  threads: ['05:10', '07:10', '09:10', '16:10', '18:10', '20:10'],
  instagram: {
    morning: '09:00', // In creator TZ (US time)
    evening: '18:00', // In creator TZ (US time)
  },
  facebook: {
    morning: '10:00', // Flexible, in creator TZ
    evening: '19:00', // Flexible, in creator TZ
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
        label: 'Like 5 posts after this post',
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
    ],
  },
  {
    platform: 'threads',
    recommendedProtocol: 'Perfect Threads Engagement Method',
    items: [
      {
        id: 'threads-text-comments',
        label: '3 text comments after this post',
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
    ],
  },
  {
    platform: 'instagram',
    recommendedProtocol: 'Perfect Instagram Method',
    items: [
      {
        id: 'ig-morning-post',
        label: 'Morning post done',
        type: 'toggle',
      },
      {
        id: 'ig-evening-post',
        label: 'Evening post done',
        type: 'toggle',
      },
      {
        id: 'ig-story',
        label: '1 story mandatory (daily)',
        type: 'toggle',
      },
    ],
  },
  {
    platform: 'facebook',
    recommendedProtocol: 'Perfect Facebook Method',
    items: [
      {
        id: 'fb-reel-morning',
        label: 'Reel morning',
        type: 'toggle',
      },
      {
        id: 'fb-reel-evening',
        label: 'Reel evening',
        type: 'toggle',
      },
      {
        id: 'fb-pic-1',
        label: 'Picture post 1',
        type: 'toggle',
      },
      {
        id: 'fb-pic-2',
        label: 'Picture post 2',
        type: 'toggle',
      },
    ],
  },
];

