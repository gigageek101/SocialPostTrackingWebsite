import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { AuthScreen } from './components/screens/AuthScreen';
import { OnboardingScreen } from './components/screens/OnboardingScreen';
import { ScheduleOverviewScreen } from './components/screens/ScheduleOverviewScreen';
import { ScheduledPostsScreen } from './components/screens/ScheduledPostsScreen';
import { ContentScreen } from './components/screens/ContentScreen';
import { WorkflowScreen } from './components/screens/WorkflowScreen';
import { CalendarScreen } from './components/screens/CalendarScreen';
import { CreatorsScreen } from './components/screens/CreatorsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';

function AppContent() {
  const { currentScreen, state, getTodayPlan, setAuthState } = useApp();
  const [urlUsername, setUrlUsername] = useState<string | null>(null);

  // Check URL for username parameter
  useEffect(() => {
    const path = window.location.pathname;
    if (path && path !== '/' && path !== '/index.html') {
      const username = path.replace('/', '').trim();
      if (username) {
        setUrlUsername(username);
      }
    }
  }, []);

  const handleAuthenticated = (creatorId: string, username: string) => {
    setAuthState({
      isAuthenticated: true,
      currentCreatorId: creatorId,
      currentUsername: username,
    });
    // URL will be /username, which is correct
    if (!window.location.pathname.includes(username)) {
      window.history.pushState({}, '', `/${username}`);
    }
  };

  // Check for notifications when slots become ready
  useEffect(() => {
    if (!state.userSettings?.notificationsEnabled) return;

    const checkNotifications = () => {
      const plan = getTodayPlan();
      if (!plan) return;

      plan.slots.forEach((slot) => {
        if (slot.status === 'pending') {
          const scheduledTime = new Date(slot.scheduledTimeUTC);
          const now = new Date();
          
          // Notify if within 5 minutes of scheduled time
          const diff = scheduledTime.getTime() - now.getTime();
          if (diff > 0 && diff < 5 * 60 * 1000) {
            const account = state.accounts.find((a) => a.id === slot.accountId);
            if (account) {
              // Show notification (would need proper notification scheduling in production)
              // For now, we just check when user is on the page
            }
          }
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkNotifications, 60000);
    checkNotifications();

    return () => clearInterval(interval);
  }, [state.userSettings, state.accounts]);

  // Show auth screen if not authenticated
  if (!state.authState?.isAuthenticated) {
    return <AuthScreen username={urlUsername || undefined} onAuthenticated={handleAuthenticated} />;
  }

  if (currentScreen === 'onboarding') {
    return <OnboardingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <main className="min-h-screen pb-24 sm:pb-0">
        {currentScreen === 'schedule-overview' && <ScheduleOverviewScreen />}
        {currentScreen === 'scheduled-posts' && <ScheduledPostsScreen />}
        {currentScreen === 'content' && <ContentScreen />}
        {currentScreen === 'workflow' && <WorkflowScreen />}
        {currentScreen === 'calendar' && <CalendarScreen />}
        {currentScreen === 'creators' && <CreatorsScreen />}
        {currentScreen === 'settings' && <SettingsScreen />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;

