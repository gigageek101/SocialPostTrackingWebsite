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
  syncCaption 
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
  logUnscheduledPost: (accountId: string, platform: string, checklistState: ChecklistState, notes: string) => void;
  
  // Daily plans
  getTodayPlan: () => DailyPlan | null;
  refreshDailyPlan: () => void;
  updateSlotStatus: (slotId: string, status: string) => void;
  
  // Export/Import
  exportData: () => void;
  importData: (data: AppState) => void;
  clearScheduleData: () => void;
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
  const [isSyncing, setIsSyncing] = useState(false);

  // Save to storage whenever state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Auto-sync: Poll for changes every 5 seconds when logged in
  useEffect(() => {
    if (!state.authState?.isAuthenticated || !state.authState?.currentCreatorId) {
      return;
    }

    const pollInterval = setInterval(async () => {
      setIsSyncing(true);
      
      const { creator, accounts, postLogs, userSettings, error } = await fetchCreatorData(
        state.authState.currentCreatorId!
      );

      if (error) {
        console.error('Auto-sync error:', error);
        setIsSyncing(false);
        return;
      }

      // Check if data has changed
      const accountsChanged = accounts.length !== state.accounts.length;
      const postsChanged = postLogs.length !== state.postLogs.length;

      if (accountsChanged || postsChanged) {
        console.log('✅ Auto-sync: Changes detected! Updating...');
        setState((prev) => ({
          ...prev,
          creators: creator ? [creator] : prev.creators,
          accounts: accounts || [],
          postLogs: postLogs || [],
          userSettings: userSettings || prev.userSettings,
          lastSync: getCurrentUTC(),
        }));
      }
      
      setIsSyncing(false);
    }, 5000); // Every 5 seconds

    return () => clearInterval(pollInterval);
  }, [state.authState?.isAuthenticated, state.authState?.currentCreatorId]);

  // Auto-sync: Reload when app becomes visible (user switches back to tab/app)
  useEffect(() => {
    if (!state.authState?.isAuthenticated || !state.authState?.currentCreatorId) {
      return;
    }

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('🔄 App focused: Syncing data...');
        setIsSyncing(true);
        
        const { creator, accounts, postLogs, userSettings, error } = await fetchCreatorData(
          state.authState.currentCreatorId!
        );

        if (!error) {
          setState((prev) => ({
            ...prev,
            creators: creator ? [creator] : prev.creators,
            accounts: accounts || [],
            postLogs: postLogs || [],
            userSettings: userSettings || prev.userSettings,
            lastSync: getCurrentUTC(),
          }));
          console.log('✅ Data synced on focus');
        }
        
        setIsSyncing(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.authState?.isAuthenticated, state.authState?.currentCreatorId]);

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
    const creator: Creator = {
      id: generateId(),
      name,
      timezone,
      createdAt: getCurrentUTC(),
    };
    
    setState((prev) => ({
      ...prev,
      creators: [...prev.creators, creator],
    }));
    
    // Sync to Supabase
    if (state.authState.isAuthenticated) {
      syncCreator(creator).catch(err => 
        console.error('Failed to sync creator:', err)
      );
    }
    
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
          syncCreator(updatedCreator).catch(err => 
            console.error('Failed to sync creator update:', err)
          );
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
  };

  const addAccount = (
    creatorId: string,
    platform: string,
    handle: string,
    device: string,
    profileLink?: string
  ): PlatformAccount => {
    const account: PlatformAccount = {
      id: generateId(),
      creatorId,
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
      syncPlatformAccount(account).catch(err => 
        console.error('Failed to sync account:', err)
      );
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
          syncPlatformAccount(updatedAccount).catch(err => 
            console.error('Failed to sync account update:', err)
          );
          
          // Sync captions if they were updated
          if (updates.captions && updatedAccount.captions) {
            updatedAccount.captions.forEach(caption => {
              syncCaption(caption, updatedAccount.id).catch(err =>
                console.error('Failed to sync caption:', err)
              );
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
      // Find the newly created post log from the updated state
      const newPostLog = state.postLogs[state.postLogs.length - 1];
      if (newPostLog) {
        syncPostLog(newPostLog).catch(err => 
          console.error('Failed to sync post log:', err)
        );
      }

      // If captions were marked as used, sync the updated account
      const updatedAccount = state.accounts.find(a => a.id === (accountId || finalAccount?.id));
      if (updatedAccount) {
        syncPlatformAccount(updatedAccount).catch(err =>
          console.error('Failed to sync account after caption update:', err)
        );
      }
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

  const clearScheduleData = () => {
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

      // Update state with Supabase data - REPLACE everything
      setState((prev) => ({
        ...prev,
        authState, // Keep the auth state we just set
        creators: creator ? [creator] : [],
        accounts: accounts || [],
        postLogs: postLogs || [],
        userSettings: userSettings || prev.userSettings,
        dailyPlans: [], // Clear daily plans, they'll regenerate
        checklistTemplates: prev.checklistTemplates, // Keep templates
        lastSync: getCurrentUTC(),
      }));

      console.log('✅ Data loaded from Supabase successfully!');
      console.log('   - Creator:', creator?.name);
      console.log('   - Accounts:', accounts.length);
      console.log('   - Posts:', postLogs.length);
      console.log('   - Settings:', userSettings ? 'Yes' : 'No');
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
        logUnscheduledPost,
        getTodayPlan,
        refreshDailyPlan,
        updateSlotStatus,
        exportData: handleExportData,
        importData: handleImportData,
        clearScheduleData,
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

