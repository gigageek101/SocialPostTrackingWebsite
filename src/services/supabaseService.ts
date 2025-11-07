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
      username: data.username,
      name: data.name,
      timezone: data.timezone,
      profilePicture: data.profile_picture,
      telegramBotToken: data.telegram_bot_token,
      telegramChatId: data.telegram_chat_id,
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
      username: data.username,
      name: data.name,
      timezone: data.timezone,
      profilePicture: data.profile_picture,
      telegramBotToken: data.telegram_bot_token,
      telegramChatId: data.telegram_chat_id,
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

    // First get accounts to query post_logs properly
    const accountsRes = await supabase.from('accounts').select('*').eq('creator_id', creatorId);
    const accountIds = (accountsRes.data || []).map(a => a.id);
    
    // Fetch all related data
    const [creatorsRes, captionsRes, postLogsRes, settingsRes] = await Promise.all([
      supabase.from('creators').select('*').eq('id', creatorId).single(),
      supabase.from('captions').select('*, accounts!inner(creator_id)').eq('accounts.creator_id', creatorId),
      accountIds.length > 0 
        ? supabase.from('post_logs').select('*').in('account_id', accountIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('user_settings').select('*').eq('creator_id', creatorId).maybeSingle(),
    ]);

    if (creatorsRes.error) throw creatorsRes.error;

    const creator: Creator = {
      id: creatorsRes.data.id,
      username: creatorsRes.data.username,
      name: creatorsRes.data.name,
      timezone: creatorsRes.data.timezone,
      profilePicture: creatorsRes.data.profile_picture,
      telegramBotToken: creatorsRes.data.telegram_bot_token,
      telegramChatId: creatorsRes.data.telegram_chat_id,
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
          hideTimesPopup: settingsRes.data.hide_times_popup || false,
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

// =============================================
// Data Fetching
// =============================================

export async function fetchCreatorData(creatorId: string): Promise<{
  creator: Creator | null;
  accounts: PlatformAccount[];
  postLogs: PostLogEntry[];
  userSettings: UserSettings | null;
  error: string | null;
}> {
  try {
    if (!isSupabaseConfigured()) {
      return { creator: null, accounts: [], postLogs: [], userSettings: null, error: 'Supabase not configured' };
    }

    const result = await syncCreatorData(creatorId);
    if (result.error || !result.data) {
      return { creator: null, accounts: [], postLogs: [], userSettings: null, error: result.error };
    }

    // Map captions to accounts
    const accountsWithCaptions = result.data.accounts.map(account => {
      const accountCaptions = result.data!.captions.filter((cap: any) => cap.accountId === account.id);
      return {
        ...account,
        captions: accountCaptions.length > 0 ? accountCaptions : undefined,
      };
    });

    return {
      creator: result.data.creator,
      accounts: accountsWithCaptions,
      postLogs: result.data.postLogs,
      userSettings: result.data.userSettings,
      error: null,
    };
  } catch (err: any) {
    return { creator: null, accounts: [], postLogs: [], userSettings: null, error: err.message };
  }
}

// =============================================
// Data Syncing (Upsert)
// =============================================

export async function syncUserSettings(settings: UserSettings): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        creator_id: settings.id,
        user_timezone: settings.userTimezone,
        notifications_enabled: settings.notificationsEnabled,
        hide_times_popup: settings.hideTimesPopup,
      }, { onConflict: 'creator_id' });

    if (error) {
      console.error('Supabase sync error (user_settings):', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function syncCreator(creator: Creator): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    // Use UPDATE instead of UPSERT to avoid password_hash issues
    // Only update fields that can be changed (not password)
    const { error } = await supabase
      .from('creators')
      .update({
        name: creator.name,
        timezone: creator.timezone,
        profile_picture: creator.profilePicture,
        telegram_bot_token: creator.telegramBotToken,
        telegram_chat_id: creator.telegramChatId,
      })
      .eq('id', creator.id);

    if (error) {
      console.error('Supabase sync error (creators):', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function syncPlatformAccount(account: PlatformAccount): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    const { error } = await supabase
      .from('accounts')
      .upsert({
        id: account.id,
        creator_id: account.creatorId,
        platform: account.platform,
        handle: account.handle,
        device: account.device,
        profile_link: account.profileLink,
        telegram_link: account.telegramLink,
      }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase sync error (accounts):', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function syncPostLog(log: PostLogEntry): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    const { error } = await supabase
      .from('post_logs')
      .upsert({
        id: log.id,
        account_id: log.accountId,
        platform: log.platform,
        timestamp_utc: log.timestampUTC,
        timestamp_creator_tz: log.timestampCreatorTZ,
        timestamp_user_tz: log.timestampUserTZ,
        checklist_state: log.checklistState,
        notes: log.notes,
        caption_id: log.captionId,
        skipped: log.skipped || false,
      }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase sync error (post_logs):', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function syncCaption(caption: Caption, accountId: string): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    const { error } = await supabase
      .from('captions')
      .upsert({
        id: caption.id,
        account_id: accountId,
        slides: caption.slides,
        title: caption.title,
        hashtags: caption.hashtags,
        used: caption.used,
      }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase sync error (captions):', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ============================================
// DELETE Functions
// ============================================

export async function deleteCreatorFromSupabase(creatorId: string): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    const { error } = await supabase
      .from('creators')
      .delete()
      .eq('id', creatorId);

    if (error) {
      console.error('Supabase delete error (creators):', error);
      return { error: error.message };
    }

    console.log('✅ Creator deleted from Supabase:', creatorId);
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteAccountFromSupabase(accountId: string): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      console.error('Supabase delete error (accounts):', error);
      return { error: error.message };
    }

    console.log('✅ Account deleted from Supabase:', accountId);
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteCaptionFromSupabase(captionId: string): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    const { error } = await supabase
      .from('captions')
      .delete()
      .eq('id', captionId);

    if (error) {
      console.error('Supabase delete error (captions):', error);
      return { error: error.message };
    }

    console.log('✅ Caption deleted from Supabase:', captionId);
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deletePostLogFromSupabase(postLogId: string): Promise<{ error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    const { error } = await supabase
      .from('post_logs')
      .delete()
      .eq('id', postLogId);

    if (error) {
      console.error('Supabase delete error (post_logs):', error);
      return { error: error.message };
    }

    console.log('✅ Post log deleted from Supabase:', postLogId);
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}

