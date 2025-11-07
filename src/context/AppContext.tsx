import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  AppState,
  AuthState,
  UserSettings,
  Creator,
  PlatformAccount,
  DailyPlan,
  PostLogEntry,
  Screen,
  ChecklistState,
  Platform,
} from '../types';
import { loadFromStorage, saveToStorage, exportData } from '../utils/storage';
import { generateId, getBrowserTimezone } from '../utils/helpers';
import { CHECKLIST_TEMPLATES, DEFAULT_CREATOR_TIMEZONE, COOLDOWN_MINUTES } from '../constants/platforms';
import { generateDailyPlan, getTodayKey } from '../utils/scheduler';
import { getCurrentUTC, formatInTimezone } from '../utils/timezone';
import { sendTelegramNotification, formatPostCompletedNotification } from '../services/telegramService';
import { markNotificationAsSent, generateNotificationKey } from '../utils/notificationTracker';
import { format } from 'date-fns';
import { 
  fetchCreatorData, 
  syncUserSettings, 
  syncCreator, 
  syncPlatformAccount, 
  syncPostLog, 
  syncCaption,
  deleteCreatorFromSupabase,
  deleteAccountFromSupabase,
  deleteAllPostLogsForCreator,
  resetAllCaptionsForCreator,
} from '../services/supabaseService';

interface AppContextType {
  state: AppState;
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  isSyncing: boolean;
  
  // Auth
  setAuthState: (authState: AuthState) => void;
  
  // User settings
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  completeOnboarding: (timezone: string, notificationsEnabled: boolean) => void;
  
  // Creators
  addCreator: (name: string, timezone?: string) => Creator;
  updateCreator: (id: string, updates: Partial<Creator>) => void;
  deleteCreator: (id: string) => void;
  
  // Accounts
  addAccount: (creatorId: string, platform: string, handle: string, device: string, profileLink?: string) => PlatformAccount;
  updateAccount: (id: string, updates: Partial<PlatformAccount>) => void;
  deleteAccount: (id: string) => void;
  
  // Posts
  logPost: (slotId: string | undefined, checklistState: ChecklistState, notes: string, accountId?: string, platform?: Platform) => void;
  skipPost: (accountId: string, platform: Platform, onComplete?: () => void) => void;
  logUnscheduledPost: (accountId: string, platform: string, checklistState: ChecklistState, notes: string) => void;
  
  // Daily plans
  getTodayPlan: () => DailyPlan | null;
  refreshDailyPlan: () => void;
  updateSlotStatus: (slotId: string, status: string) => void;
  
  // Export/Import
  exportData: () => void;
  importData: (data: AppState) => void;
  clearScheduleData: () => Promise<void>;
  manualSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadFromStorage();
    
    if (loaded) {
      return loaded;
    }
    
    // Initial state
    return {
      authState: {
        isAuthenticated: false,
        currentCreatorId: null,
        currentUsername: null,
      },
      userSettings: null,
      creators: [],
      accounts: [],
      dailyPlans: [],
      postLogs: [],
      checklistTemplates: CHECKLIST_TEMPLATES,
      lastSync: getCurrentUTC(),
    };
  });
  
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    return state.userSettings ? 'schedule-overview' : 'onboarding';
  });
  const [pauseAutoSync, setPauseAutoSync] = useState(false);
  const isSyncing = false; // Auto-sync disabled to prevent data loss

  // Save to storage whenever state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Smart auto-sync: Poll for changes and MERGE intelligently (never replace/delete)
  useEffect(() => {
    if (!state.authState?.isAuthenticated || !state.authState?.currentCreatorId || pauseAutoSync) {
      return;
    }

    const smartSync = async () => {
      const { creator, accounts, postLogs, userSettings } = await fetchCreatorData(
        state.authState.currentCreatorId!
      );

      setState((prev) => {
        // Smart merge accounts: Keep all local accounts, add new ones from server
        const localAccountIds = new Set(prev.accounts.map(a => a.id));
        
        // Merge accounts intelligently
        const mergedAccounts = prev.accounts.map(localAccount => {
          const serverAccount = accounts.find(a => a.id === localAccount.id);
          if (serverAccount) {
            // If server has this account, check which is newer
            // For captions, MERGE them (keep all local + add new server ones)
            const localCaptionIds = new Set((localAccount.captions || []).map(c => c.id));
            const serverCaptions = serverAccount.captions || [];
            const newServerCaptions = serverCaptions.filter(c => !localCaptionIds.has(c.id));
            
            return {
              ...localAccount,
              captions: [...(localAccount.captions || []), ...newServerCaptions]
            };
          }
          return localAccount;
        });
        
        // Add accounts that only exist on server
        const newServerAccounts = accounts.filter(a => !localAccountIds.has(a.id));
        const finalAccounts = [...mergedAccounts, ...newServerAccounts];
        
        // Smart merge posts: Keep all local posts, add new ones from server
        const localPostIds = new Set(prev.postLogs.map(p => p.id));
        const newServerPosts = postLogs.filter(p => !localPostIds.has(p.id));
        const finalPosts = [...prev.postLogs, ...newServerPosts];
        
        return {
          ...prev,
          creators: creator ? [creator] : prev.creators,
          accounts: finalAccounts,
          postLogs: finalPosts,
          userSettings: userSettings || prev.userSettings,
          lastSync: getCurrentUTC(),
        };
      });
    };

    // Sync every 3 seconds
    const pollInterval = setInterval(smartSync, 3000);
    
    // Initial sync
    smartSync();

    return () => clearInterval(pollInterval);
  }, [state.authState?.isAuthenticated, state.authState?.currentCreatorId, pauseAutoSync]);

  // Check and refresh daily plan on mount and daily
  useEffect(() => {
    if (!state.userSettings) return;
    
    refreshDailyPlan();
    
    // Check every minute for plan refresh
    const interval = setInterval(() => {
      const today = getTodayKey();
      const existingPlan = state.dailyPlans.find((p) => p.date === today);
      
      if (!existingPlan) {
        refreshDailyPlan();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [state.userSettings, state.accounts.length]);

  const updateUserSettings = (updates: Partial<UserSettings>) => {
    setState((prev) => {
      const updated = prev.userSettings
        ? { ...prev.userSettings, ...updates }
        : null;
      
      // Sync to Supabase
      if (updated && state.authState.isAuthenticated) {
        syncUserSettings(updated).catch(err => 
          console.error('Failed to sync user settings:', err)
        );
      }
      
      return {
        ...prev,
        userSettings: updated,
      };
    });
  };

  const completeOnboarding = (timezone: string, notificationsEnabled: boolean) => {
    const userSettings: UserSettings = {
      id: generateId(),
      userTimezone: timezone,
      notificationsEnabled,
      hideTimesPopup: false,
      createdAt: getCurrentUTC(),
    };
    
    setState((prev) => ({
      ...prev,
      userSettings,
    }));
    
    setCurrentScreen('schedule-overview');
  };

  const addCreator = (name: string, timezone = DEFAULT_CREATOR_TIMEZONE): Creator => {
    // NOTE: Creators should only be created through AuthScreen (Supabase)
    // This function is kept for backward compatibility but should not sync
    const creator: Creator = {
      id: generateId(),
      username: name.toLowerCase().replace(/\s/g, ''), // Generate username from name
      name,
      timezone,
      createdAt: getCurrentUTC(),
    };
    
    setState((prev) => ({
      ...prev,
      creators: [...prev.creators, creator],
    }));
    
    // DO NOT sync locally-created creators to Supabase
    // Only creators from AuthScreen should exist in Supabase
    console.warn('⚠️ Creator created locally - will not sync to Supabase');
    
    return creator;
  };

  const updateCreator = (id: string, updates: Partial<Creator>) => {
    setState((prev) => {
      const updatedCreators = prev.creators.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      
      // Sync to Supabase
      if (state.authState.isAuthenticated) {
        const updatedCreator = updatedCreators.find(c => c.id === id);
        if (updatedCreator) {
          console.log('⬆️ Syncing creator update to Supabase:', updatedCreator.name);
          syncCreator(updatedCreator).then(result => {
            if (result.error) {
              console.error('❌ Failed to sync creator update:', result.error);
              alert(`⚠️ Failed to sync creator update: ${result.error}`);
            } else {
              console.log('✅ Creator update synced to cloud');
            }
          });
        }
      }
      
      return {
        ...prev,
        creators: updatedCreators,
      };
    });
  };

  const deleteCreator = (id: string) => {
    setState((prev) => ({
      ...prev,
      creators: prev.creators.filter((c) => c.id !== id),
      accounts: prev.accounts.filter((a) => a.creatorId !== id),
    }));
    
    // Delete from Supabase
    if (state.authState.isAuthenticated) {
      console.log('🗑️ Deleting creator from Supabase:', id);
      deleteCreatorFromSupabase(id).then(result => {
        if (result.error) {
          console.error('❌ Failed to delete creator:', result.error);
          alert(`⚠️ Failed to delete creator from cloud: ${result.error}`);
        } else {
          console.log('✅ Creator deleted from cloud');
        }
      });
    }
  };

  const addAccount = (
    creatorId: string,
    platform: string,
    handle: string,
    device: string,
    profileLink?: string
  ): PlatformAccount => {
    // CRITICAL: If user is authenticated, ALWAYS use the Supabase creator ID
    const finalCreatorId = state.authState.isAuthenticated && state.authState.currentCreatorId
      ? state.authState.currentCreatorId
      : creatorId;
    
    console.log('🆔 Creating account with creator ID:', finalCreatorId);
    
    const account: PlatformAccount = {
      id: generateId(),
      creatorId: finalCreatorId,
      platform: platform as any,
      handle,
      device,
      profileLink,
      createdAt: getCurrentUTC(),
    };
    
    setState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, account],
    }));
    
    // Sync to Supabase
    if (state.authState.isAuthenticated) {
      console.log('⬆️ Syncing new account to Supabase:', account.handle);
      syncPlatformAccount(account).then(result => {
        if (result.error) {
          console.error('❌ Failed to sync account:', result.error);
          alert(`⚠️ Failed to sync account: ${result.error}`);
        } else {
          console.log('✅ Account synced to cloud:', account.handle);
        }
      });
    }
    
    // Refresh daily plan when new account is added
    setTimeout(() => refreshDailyPlan(), 100);
    
    return account;
  };

  const updateAccount = (id: string, updates: Partial<PlatformAccount>) => {
    setState((prev) => {
      const updatedAccounts = prev.accounts.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      );
      
      // Sync to Supabase
      if (state.authState.isAuthenticated) {
        const updatedAccount = updatedAccounts.find(a => a.id === id);
        if (updatedAccount) {
          console.log('⬆️ Syncing account update to Supabase:', updatedAccount.handle);
          syncPlatformAccount(updatedAccount).then(result => {
            if (result.error) {
              console.error('❌ Failed to sync account update:', result.error);
            } else {
              console.log('✅ Account update synced');
            }
          });
          
          // Sync captions if they were updated
          if (updates.captions && updatedAccount.captions) {
            console.log(`⬆️ Syncing ${updatedAccount.captions.length} caption(s) to Supabase...`);
            updatedAccount.captions.forEach(async (caption) => {
              const result = await syncCaption(caption, updatedAccount.id);
              if (result.error) {
                console.error('❌ Failed to sync caption:', result.error);
              } else {
                console.log('✅ Caption synced to cloud');
              }
            });
          }
        }
      }
      
      return {
        ...prev,
        accounts: updatedAccounts,
      };
    });
  };

  const deleteAccount = (id: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== id),
    }));
    
    // Delete from Supabase
    if (state.authState.isAuthenticated) {
      console.log('🗑️ Deleting account from Supabase:', id);
      deleteAccountFromSupabase(id).then(result => {
        if (result.error) {
          console.error('❌ Failed to delete account:', result.error);
          alert(`⚠️ Failed to delete account from cloud: ${result.error}`);
        } else {
          console.log('✅ Account deleted from cloud');
        }
      });
    }
  };

  const logPost = async (
    slotId: string | undefined, 
    checklistState: ChecklistState, 
    notes: string,
    accountId?: string,
    platform?: Platform
  ) => {
    const now = getCurrentUTC();
    
    setState((prev) => {
      let targetAccountId: string;
      let targetPlatform: Platform;
      
      if (slotId) {
        // Scheduled post with slot
        const plan = prev.dailyPlans.find((p) => p.date === getTodayKey());
        if (!plan) return prev;
        
        const slot = plan.slots.find((s) => s.id === slotId);
        if (!slot) return prev;
        
        targetAccountId = slot.accountId;
        targetPlatform = slot.platform;
        
        const account = prev.accounts.find((a) => a.id === targetAccountId);
        if (!account) return prev;
        
        const creator = prev.creators.find((c) => c.id === account.creatorId);
        
        // Auto-assign caption for TikTok
        let assignedCaptionId: string | undefined;
        let updatedAccounts = prev.accounts;
        
        if (targetPlatform === 'tiktok' && account.captions && account.captions.length > 0) {
          const nextCaption = account.captions.find(c => !c.used);
          if (nextCaption) {
            assignedCaptionId = nextCaption.id;
            // Mark caption as used
            updatedAccounts = prev.accounts.map(a => 
              a.id === account.id 
                ? { ...a, captions: a.captions?.map(c => c.id === nextCaption.id ? { ...c, used: true } : c) }
                : a
            );
          }
        }
        
        const postLog: PostLogEntry = {
          id: generateId(),
          slotId,
          accountId: targetAccountId,
          platform: targetPlatform,
          timestampUTC: now,
          timestampCreatorTZ: formatInTimezone(
            now,
            creator?.timezone || DEFAULT_CREATOR_TIMEZONE,
            true
          ),
          timestampUserTZ: formatInTimezone(
            now,
            prev.userSettings?.userTimezone || getBrowserTimezone(),
            true
          ),
          checklistState,
          notes,
          captionId: assignedCaptionId,
          createdAt: now,
        };
        
        // Update slot status
        const updatedPlan = {
          ...plan,
          slots: plan.slots.map((s) =>
            s.id === slotId
              ? { ...s, status: 'posted' as const, postLogId: postLog.id }
              : s
          ),
        };
        
        return {
          ...prev,
          accounts: updatedAccounts,
          postLogs: [...prev.postLogs, postLog],
          dailyPlans: prev.dailyPlans.map((p) =>
            p.id === plan.id ? updatedPlan : p
          ),
        };
      } else {
        // Dynamic post without slot (requires accountId and platform)
        if (!accountId || !platform) return prev;
        
        const account = prev.accounts.find((a) => a.id === accountId);
        if (!account) return prev;
        
        const creator = prev.creators.find((c) => c.id === account.creatorId);
        
        // Auto-assign caption for TikTok
        let assignedCaptionId: string | undefined;
        let updatedAccounts = prev.accounts;
        
        if (platform === 'tiktok' && account.captions && account.captions.length > 0) {
          const nextCaption = account.captions.find(c => !c.used);
          if (nextCaption) {
            assignedCaptionId = nextCaption.id;
            // Mark caption as used
            updatedAccounts = prev.accounts.map(a => 
              a.id === account.id 
                ? { ...a, captions: a.captions?.map(c => c.id === nextCaption.id ? { ...c, used: true } : c) }
                : a
            );
          }
        }
        
        const postLog: PostLogEntry = {
          id: generateId(),
          slotId: undefined,
          accountId,
          platform,
          timestampUTC: now,
          timestampCreatorTZ: formatInTimezone(
            now,
            creator?.timezone || DEFAULT_CREATOR_TIMEZONE,
            true
          ),
          timestampUserTZ: formatInTimezone(
            now,
            prev.userSettings?.userTimezone || getBrowserTimezone(),
            true
          ),
          checklistState,
          notes,
          captionId: assignedCaptionId,
          createdAt: now,
        };
        
        return {
          ...prev,
          accounts: updatedAccounts,
          postLogs: [...prev.postLogs, postLog],
        };
      }
    });

    // Send Telegram notification after post is logged
    const finalAccount = state.accounts.find(a => a.id === (accountId || state.accounts[0]?.id));
    if (finalAccount) {
      const creator = state.creators.find(c => c.id === finalAccount.creatorId);
      if (creator?.telegramBotToken && creator?.telegramChatId) {
        // Determine shift and post number
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayPosts = state.postLogs.filter(log => {
          const logDate = format(new Date(log.timestampUTC), 'yyyy-MM-dd');
          return logDate === today && log.accountId === finalAccount.id;
        });

        const userTimeStr = formatInTimezone(now, state.userSettings?.userTimezone || getBrowserTimezone(), false);
        const isPM = userTimeStr.includes('PM');
        const timeMatch = userTimeStr.match(/(\d+):(\d+)/);
        let shift: 'morning' | 'evening' = 'morning';
        
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          if (isPM && hour !== 12) hour += 12;
          if (!isPM && hour === 12) hour = 0;
          shift = hour < 14 ? 'morning' : 'evening';
        }

        const shiftPosts = todayPosts.filter(p => {
          const postUserTimeStr = p.timestampUserTZ;
          const postIsPM = postUserTimeStr.includes('PM');
          const postTimeMatch = postUserTimeStr.match(/(\d+):(\d+)/);
          if (postTimeMatch) {
            let postHour = parseInt(postTimeMatch[1]);
            if (postIsPM && postHour !== 12) postHour += 12;
            if (!postIsPM && postHour === 12) postHour = 0;
            const postShift = postHour < 14 ? 'morning' : 'evening';
            return postShift === shift;
          }
          return false;
        });

        const postNumber = shiftPosts.length + 1;
        const waitMinutes = COOLDOWN_MINUTES[finalAccount.platform] || 120;

        const notificationKey = generateNotificationKey('post-completed', finalAccount.id, shift, postNumber, today);
        
        // Send notification asynchronously (don't wait)
        sendTelegramNotification(
          creator.telegramBotToken,
          creator.telegramChatId,
          {
            text: formatPostCompletedNotification(
              finalAccount.platform,
              finalAccount.handle,
              postNumber,
              shift,
              waitMinutes
            ),
            parseMode: 'HTML',
          }
        ).then(() => {
          markNotificationAsSent(notificationKey);
        }).catch(err => {
          console.error('Failed to send Telegram notification:', err);
        });
      }
    }

    // Sync post log to Supabase
    if (state.authState.isAuthenticated) {
      // Get the most recent post from the updated state
      setTimeout(async () => {
        const currentState = state;
        const newPostLog = currentState.postLogs[currentState.postLogs.length - 1];
        if (newPostLog) {
          console.log('⬆️ Syncing post to Supabase:', newPostLog.platform);
          const result = await syncPostLog(newPostLog);
          if (result.error) {
            console.error('❌ Failed to sync post log:', result.error);
            alert(`⚠️ Failed to sync post: ${result.error}`);
          } else {
            console.log('✅ Post synced to cloud');
          }
        }

        // If captions were marked as used, sync the updated account
        const updatedAccount = currentState.accounts.find(a => a.id === (accountId || finalAccount?.id));
        if (updatedAccount) {
          console.log('⬆️ Syncing caption status to Supabase');
          await syncPlatformAccount(updatedAccount);
        }
      }, 100);
    }
  };

  const skipPost = (accountId: string, platform: Platform, onComplete?: () => void) => {
    const now = getCurrentUTC();
    
    // PAUSE auto-sync to prevent conflicts
    console.log('⏸️ Pausing auto-sync for skip operation');
    setPauseAutoSync(true);
    
    const account = state.accounts.find((a) => a.id === accountId);
    if (!account) {
      setPauseAutoSync(false);
      return;
    }
    
    const creator = state.creators.find((c) => c.id === account.creatorId);
    
    const postLog: PostLogEntry = {
      id: generateId(),
      slotId: undefined,
      accountId,
      platform,
      timestampUTC: now,
      timestampCreatorTZ: formatInTimezone(
        now,
        creator?.timezone || DEFAULT_CREATOR_TIMEZONE,
        true
      ),
      timestampUserTZ: formatInTimezone(
        now,
        state.userSettings?.userTimezone || getBrowserTimezone(),
        true
      ),
      checklistState: {
        platform,
        items: [],
        modified: false,
      },
      notes: 'Post skipped',
      skipped: true, // Mark as skipped
      createdAt: now,
    };
    
    setState((prev) => ({
      ...prev,
      postLogs: [...prev.postLogs, postLog],
    }));
    
    console.log('⏭️ Post skipped (no cooldown applied)');
    
    // Sync to Supabase FIRST, then call onComplete
    if (state.authState.isAuthenticated) {
      setTimeout(async () => {
        console.log('⬆️ Syncing skipped post to Supabase');
        const result = await syncPostLog(postLog);
        if (result.error) {
          console.error('❌ Failed to sync skipped post:', result.error);
        } else {
          console.log('✅ Skipped post synced to cloud');
        }
        
        // RESUME auto-sync after sync completes
        setTimeout(() => {
          console.log('▶️ Resuming auto-sync');
          setPauseAutoSync(false);
        }, 500);
        
        // Call onComplete callback after sync
        if (onComplete) {
          setTimeout(onComplete, 100);
        }
      }, 50);
    } else {
      // No auth, just call onComplete and resume
      if (onComplete) {
        setTimeout(onComplete, 50);
      }
      setTimeout(() => {
        setPauseAutoSync(false);
      }, 500);
    }
  };

  const logUnscheduledPost = (
    accountId: string,
    platform: string,
    checklistState: ChecklistState,
    notes: string
  ) => {
    const now = getCurrentUTC();
    
    setState((prev) => {
      const account = prev.accounts.find((a) => a.id === accountId);
      if (!account) return prev;
      
      const creator = prev.creators.find((c) => c.id === account.creatorId);
      
      const postLog: PostLogEntry = {
        id: generateId(),
        accountId,
        platform: platform as any,
        timestampUTC: now,
        timestampCreatorTZ: formatInTimezone(
          now,
          creator?.timezone || DEFAULT_CREATOR_TIMEZONE,
          true
        ),
        timestampUserTZ: formatInTimezone(
          now,
          prev.userSettings?.userTimezone || getBrowserTimezone(),
          true
        ),
        checklistState,
        notes,
        createdAt: now,
      };
      
      return {
        ...prev,
        postLogs: [...prev.postLogs, postLog],
      };
    });
  };

  const getTodayPlan = (): DailyPlan | null => {
    const today = getTodayKey();
    return state.dailyPlans.find((p) => p.date === today) || null;
  };

  const refreshDailyPlan = () => {
    if (!state.userSettings || state.accounts.length === 0) return;
    
    const today = getTodayKey();
    const slots = generateDailyPlan(
      state.accounts,
      state.creators,
      state.userSettings,
      new Date(),
      state.postLogs
    );
    
    const existingPlan = state.dailyPlans.find((p) => p.date === today);
    
    if (existingPlan) {
      // Update existing plan, preserving statuses
      const updatedSlots = slots.map((newSlot) => {
        const existing = existingPlan.slots.find(
          (s) => s.accountId === newSlot.accountId && 
                 s.scheduledTimeUTC === newSlot.scheduledTimeUTC
        );
        return existing || newSlot;
      });
      
      setState((prev) => ({
        ...prev,
        dailyPlans: prev.dailyPlans.map((p) =>
          p.date === today ? { ...p, slots: updatedSlots } : p
        ),
      }));
    } else {
      // Create new plan
      const newPlan: DailyPlan = {
        id: generateId(),
        date: today,
        slots,
        createdAt: getCurrentUTC(),
      };
      
      setState((prev) => ({
        ...prev,
        dailyPlans: [...prev.dailyPlans, newPlan],
      }));
    }
  };

  const updateSlotStatus = (slotId: string, status: string) => {
    setState((prev) => {
      const plan = prev.dailyPlans.find((p) => p.date === getTodayKey());
      if (!plan) return prev;
      
      const updatedPlan = {
        ...plan,
        slots: plan.slots.map((s) =>
          s.id === slotId ? { ...s, status: status as any } : s
        ),
      };
      
      return {
        ...prev,
        dailyPlans: prev.dailyPlans.map((p) =>
          p.id === plan.id ? updatedPlan : p
        ),
      };
    });
  };

  const handleExportData = () => {
    exportData(state);
  };

  const handleImportData = (data: AppState) => {
    setState(data);
  };

  const clearScheduleData = async () => {
    // Pause auto-sync during operation
    setPauseAutoSync(true);
    
    console.log('🗑️ Clearing schedule data...');
    
    // Clear from Supabase first if authenticated
    if (state.authState?.isAuthenticated && state.authState?.currentCreatorId) {
      console.log('⬆️ Deleting all post logs from Supabase...');
      const deleteResult = await deleteAllPostLogsForCreator(state.authState.currentCreatorId);
      if (deleteResult.error) {
        console.error('❌ Failed to delete post logs:', deleteResult.error);
        alert(`⚠️ Failed to delete posts from cloud: ${deleteResult.error}`);
        setPauseAutoSync(false);
        return;
      }
      
      console.log('⬆️ Resetting all captions in Supabase...');
      const resetResult = await resetAllCaptionsForCreator(state.authState.currentCreatorId);
      if (resetResult.error) {
        console.error('❌ Failed to reset captions:', resetResult.error);
        alert(`⚠️ Failed to reset captions: ${resetResult.error}`);
        setPauseAutoSync(false);
        return;
      }
      
      console.log('✅ Schedule data deleted from cloud');
    }
    
    // Now clear locally
    setState((prev) => {
      // Reset all captions to unused
      const resetAccounts = prev.accounts.map(account => ({
        ...account,
        captions: account.captions?.map(caption => ({ ...caption, used: false }))
      }));

      return {
        ...prev,
        accounts: resetAccounts,
        postLogs: [], // Clear all posts
        dailyPlans: [], // Clear all daily plans
      };
    });
    
    console.log('✅ Schedule data cleared locally');
    
    // Resume auto-sync after a delay
    setTimeout(() => {
      setPauseAutoSync(false);
    }, 1000);
  };

  const manualSync = async () => {
    if (!state.authState?.isAuthenticated || !state.authState?.currentCreatorId) {
      throw new Error('Not authenticated');
    }

    console.log('🔄 Manual sync requested...');
    setPauseAutoSync(true);

    try {
      const { creator, accounts, postLogs, userSettings, error } = await fetchCreatorData(
        state.authState.currentCreatorId
      );

      if (error) {
        console.error('❌ Failed to sync from cloud:', error);
        throw new Error(error);
      }

      setState((prev) => ({
        ...prev,
        creators: creator ? [creator] : prev.creators,
        accounts: accounts,
        postLogs: postLogs,
        userSettings: userSettings || prev.userSettings,
        lastSync: getCurrentUTC(),
      }));

      console.log('✅ Manual sync complete');
    } finally {
      setTimeout(() => {
        setPauseAutoSync(false);
      }, 1000);
    }
  };

  const setAuthState = async (authState: AuthState) => {
    // First update auth state
    setState((prev) => ({
      ...prev,
      authState,
    }));

    // Load data from Supabase when user logs in
    if (authState.isAuthenticated && authState.currentCreatorId) {
      console.log('🔄 Loading data from Supabase for creator:', authState.currentCreatorId);
      
      const { creator, accounts, postLogs, userSettings, error } = await fetchCreatorData(
        authState.currentCreatorId
      );

      if (error) {
        console.error('❌ Failed to load data from Supabase:', error);
        alert('⚠️ Failed to load your data from the cloud. Please try again.');
        return;
      }

      console.log('📦 Raw data from Supabase:', {
        creator: creator?.name,
        accounts: accounts.length,
        postLogs: postLogs.length,
        userSettings: userSettings?.userTimezone,
      });

      // CRITICAL: Merge local accounts with Supabase accounts
      // Update any local accounts to use the correct Supabase creator ID
      setState((prev) => {
        if (!authState.currentCreatorId) {
          console.error('❌ No creator ID in auth state');
          return prev;
        }
        
        const supabaseAccountIds = new Set(accounts.map(a => a.id));
        
        // Get local accounts that aren't in Supabase yet
        const localAccountsNotInSupabase = prev.accounts.filter(
          a => !supabaseAccountIds.has(a.id)
        );
        
        // Update local accounts to use the correct creator ID
        const updatedLocalAccounts = localAccountsNotInSupabase.map(account => ({
          ...account,
          creatorId: authState.currentCreatorId!,
        }));
        
        // Merge: Supabase accounts + updated local accounts
        const mergedAccounts = [...accounts, ...updatedLocalAccounts];
        
        console.log('🔄 Merging accounts:', {
          fromSupabase: accounts.length,
          localOnly: updatedLocalAccounts.length,
          total: mergedAccounts.length,
        });
        
        return {
          ...prev,
          authState, // Keep the auth state we just set
          creators: creator ? [creator] : [],
          accounts: mergedAccounts,
          postLogs: postLogs || [],
          userSettings: userSettings || prev.userSettings,
          dailyPlans: [], // Clear daily plans, they'll regenerate
          checklistTemplates: prev.checklistTemplates, // Keep templates
          lastSync: getCurrentUTC(),
        };
      });

      console.log('✅ Data loaded from Supabase successfully!');
      console.log('   - Creator:', creator?.name);
      console.log('   - Accounts:', accounts.length);
      console.log('   - Posts:', postLogs.length);
      console.log('   - Settings:', userSettings ? 'Yes' : 'No');
      
      // Sync any local accounts that weren't in Supabase
      setState((prev) => {
        const supabaseAccountIds = new Set(accounts.map(a => a.id));
        const localAccountsToSync = prev.accounts.filter(a => !supabaseAccountIds.has(a.id));
        
        if (localAccountsToSync.length > 0) {
          console.log(`⬆️ Syncing ${localAccountsToSync.length} local account(s) to Supabase...`);
          
          localAccountsToSync.forEach(async (account) => {
            const result = await syncPlatformAccount(account);
            if (result.error) {
              console.error('❌ Failed to sync local account:', account.handle, result.error);
            } else {
              console.log('✅ Local account synced:', account.handle);
            }
          });
        }
        
        return prev;
      });
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        currentScreen,
        setCurrentScreen,
        isSyncing,
        setAuthState,
        updateUserSettings,
        completeOnboarding,
        addCreator,
        updateCreator,
        deleteCreator,
        addAccount,
        updateAccount,
        deleteAccount,
        logPost,
        skipPost,
        logUnscheduledPost,
        getTodayPlan,
        refreshDailyPlan,
        updateSlotStatus,
        exportData: handleExportData,
        importData: handleImportData,
        clearScheduleData,
        manualSync,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

