import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  AppState,
  UserSettings,
  Creator,
  PlatformAccount,
  DailyPlan,
  PostLogEntry,
  Screen,
  ChecklistState,
} from '../types';
import { loadFromStorage, saveToStorage, exportData } from '../utils/storage';
import { generateId, getBrowserTimezone } from '../utils/helpers';
import { CHECKLIST_TEMPLATES, DEFAULT_CREATOR_TIMEZONE } from '../constants/platforms';
import { generateDailyPlan, getTodayKey } from '../utils/scheduler';
import { getCurrentUTC, formatInTimezone } from '../utils/timezone';

interface AppContextType {
  state: AppState;
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  
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
  logPost: (slotId: string, checklistState: ChecklistState, notes: string) => void;
  logUnscheduledPost: (accountId: string, platform: string, checklistState: ChecklistState, notes: string) => void;
  
  // Daily plans
  getTodayPlan: () => DailyPlan | null;
  refreshDailyPlan: () => void;
  updateSlotStatus: (slotId: string, status: string) => void;
  
  // Export/Import
  exportData: () => void;
  importData: (data: AppState) => void;
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

  // Save to storage whenever state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

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
    setState((prev) => ({
      ...prev,
      userSettings: prev.userSettings
        ? { ...prev.userSettings, ...updates }
        : null,
    }));
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
    
    return creator;
  };

  const updateCreator = (id: string, updates: Partial<Creator>) => {
    setState((prev) => ({
      ...prev,
      creators: prev.creators.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
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
    
    // Refresh daily plan when new account is added
    setTimeout(() => refreshDailyPlan(), 100);
    
    return account;
  };

  const updateAccount = (id: string, updates: Partial<PlatformAccount>) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  };

  const deleteAccount = (id: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== id),
    }));
  };

  const logPost = (slotId: string, checklistState: ChecklistState, notes: string) => {
    const now = getCurrentUTC();
    
    setState((prev) => {
      const plan = prev.dailyPlans.find((p) => p.date === getTodayKey());
      if (!plan) return prev;
      
      const slot = plan.slots.find((s) => s.id === slotId);
      if (!slot) return prev;
      
      const account = prev.accounts.find((a) => a.id === slot.accountId);
      if (!account) return prev;
      
      const creator = prev.creators.find((c) => c.id === account.creatorId);
      
      const postLog: PostLogEntry = {
        id: generateId(),
        slotId,
        accountId: slot.accountId,
        platform: slot.platform,
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
        postLogs: [...prev.postLogs, postLog],
        dailyPlans: prev.dailyPlans.map((p) =>
          p.id === plan.id ? updatedPlan : p
        ),
      };
    });
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

  return (
    <AppContext.Provider
      value={{
        state,
        currentScreen,
        setCurrentScreen,
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

