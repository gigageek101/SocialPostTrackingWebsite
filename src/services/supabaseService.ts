import { supabase, isSupabaseConfigured } from '../config/supabase';
import { Creator, PlatformAccount, PostLogEntry, UserSettings, Caption } from '../types';
import bcrypt from 'bcryptjs';

// =============================================
// Authentication
// =============================================

export async function createCreatorWithPassword(
  username: string,
  password: string,
  name: string,
  timezone: string,
  profilePicture?: string
): Promise<{ creator: Creator; error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { creator: null as any, error: 'Supabase not configured' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert creator
    const { data, error } = await supabase
      .from('creators')
      .insert({
        username: username.toLowerCase().trim(),
        password_hash: passwordHash,
        name,
        timezone,
        profile_picture: profilePicture,
      })
      .select()
      .single();

    if (error) {
      return { creator: null as any, error: error.message };
    }

    const creator: Creator = {
      id: data.id,
      name: data.name,
      timezone: data.timezone,
      profilePicture: data.profile_picture,
      createdAt: data.created_at,
    };

    return { creator, error: null };
  } catch (err: any) {
    return { creator: null as any, error: err.message };
  }
}

export async function authenticateCreator(
  username: string,
  password: string
): Promise<{ creator: Creator | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { creator: null, error: 'Supabase not configured' };
    }

    // Get creator by username
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (error || !data) {
      return { creator: null, error: 'Username not found' };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, data.password_hash);
    if (!isValid) {
      return { creator: null, error: 'Invalid password' };
    }

    const creator: Creator = {
      id: data.id,
      name: data.name,
      timezone: data.timezone,
      profilePicture: data.profile_picture,
      createdAt: data.created_at,
    };

    return { creator, error: null };
  } catch (err: any) {
    return { creator: null, error: err.message };
  }
}

// =============================================
// Data Sync Functions
// =============================================

export async function syncCreatorData(creatorId: string) {
  try {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase not configured' };
    }

    // Fetch all related data
    const [creatorsRes, accountsRes, captionsRes, postLogsRes, settingsRes] = await Promise.all([
      supabase.from('creators').select('*').eq('id', creatorId).single(),
      supabase.from('accounts').select('*').eq('creator_id', creatorId),
      supabase.from('captions').select('*, accounts!inner(creator_id)').eq('accounts.creator_id', creatorId),
      supabase.from('post_logs').select('*').eq('creator_id', creatorId),
      supabase.from('user_settings').select('*').eq('creator_id', creatorId).single(),
    ]);

    if (creatorsRes.error) throw creatorsRes.error;

    const creator: Creator = {
      id: creatorsRes.data.id,
      name: creatorsRes.data.name,
      timezone: creatorsRes.data.timezone,
      profilePicture: creatorsRes.data.profile_picture,
      createdAt: creatorsRes.data.created_at,
    };

    const accounts: PlatformAccount[] = (accountsRes.data || []).map((acc: any) => ({
      id: acc.id,
      creatorId: acc.creator_id,
      platform: acc.platform,
      handle: acc.handle,
      device: acc.device,
      profileLink: acc.profile_link,
      telegramLink: acc.telegram_link,
      createdAt: acc.created_at,
    }));

    const captions: Caption[] = (captionsRes.data || []).map((cap: any) => ({
      id: cap.id,
      slides: cap.slides,
      title: cap.title,
      hashtags: cap.hashtags,
      used: cap.used,
      createdAt: cap.created_at,
    }));

    const postLogs: PostLogEntry[] = (postLogsRes.data || []).map((log: any) => ({
      id: log.id,
      accountId: log.account_id,
      platform: log.platform,
      timestampUTC: log.timestamp_utc,
      timestampCreatorTZ: log.timestamp_creator_tz,
      timestampUserTZ: log.timestamp_user_tz,
      checklistState: log.checklist_state,
      notes: log.notes,
      captionId: log.caption_id,
      createdAt: log.created_at,
    }));

    const userSettings: UserSettings | null = settingsRes.data
      ? {
          id: settingsRes.data.creator_id,
          userTimezone: settingsRes.data.user_timezone,
          notificationsEnabled: settingsRes.data.notifications_enabled,
          hideTimesPopup: false,
          createdAt: settingsRes.data.created_at,
        }
      : null;

    return {
      data: {
        creator,
        accounts,
        captions,
        postLogs,
        userSettings,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// =============================================
// Real-time Subscriptions
// =============================================

export function subscribeToCreatorChanges(
  creatorId: string,
  onUpdate: () => void
) {
  if (!isSupabaseConfigured()) return null;

  const channel = supabase
    .channel(`creator-${creatorId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'accounts',
        filter: `creator_id=eq.${creatorId}`,
      },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'post_logs',
        filter: `creator_id=eq.${creatorId}`,
      },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'captions',
      },
      () => onUpdate()
    )
    .subscribe();

  return channel;
}

