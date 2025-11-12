import { History, Home, Users, Settings, List, FileText, BookOpen, UserCog, Sun, Moon, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Screen } from '../types';

export function Navigation() {
  const { currentScreen, setCurrentScreen } = useApp();
  const { theme, toggleTheme } = useTheme();

  const navItems: Array<{ screen: Screen; icon: React.ReactNode; label: string }> = [
    { screen: 'schedule-overview', icon: <Home className="w-6 h-6" />, label: 'Today' },
    { screen: 'scheduled-posts', icon: <List className="w-6 h-6" />, label: 'Today History' },
    { screen: 'schedule-settings', icon: <Settings className="w-6 h-6" />, label: 'Schedule' },
    { screen: 'content', icon: <FileText className="w-6 h-6" />, label: 'Content' },
    { screen: 'workflow', icon: <BookOpen className="w-6 h-6" />, label: 'Workflow' },
    { screen: 'schedule-history', icon: <History className="w-6 h-6" />, label: 'History' },
    { screen: 'statistics', icon: <TrendingUp className="w-6 h-6" />, label: 'Stats' },
    { screen: 'creators', icon: <Users className="w-6 h-6" />, label: 'Creators' },
    { screen: 'creator-settings', icon: <UserCog className="w-6 h-6" />, label: 'Creator' },
    { screen: 'settings', icon: <Settings className="w-6 h-6" />, label: 'Settings' },
  ];

  return (
    <>
          {/* Desktop Navigation - Top */}
          <nav className="hidden md:block shadow-sm border-b sticky top-0 z-40 transition-all duration-300"
               style={{ 
                 backgroundColor: 'var(--color-elevated)', 
                 borderColor: 'var(--color-border)',
                 boxShadow: 'var(--shadow-md)'
               }}>
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-between items-center">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-3 rounded-lg transition-all duration-300 hover:scale-110"
                  style={{ color: 'var(--color-orange)' }}
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
                
                <div className="flex justify-center items-center gap-2 flex-1">
            {navItems.map((item) => {
              const isActive = currentScreen === item.screen;
              
              return (
                <button
                  key={item.screen}
                  onClick={() => setCurrentScreen(item.screen)}
                  className={`flex flex-col items-center gap-1 px-8 py-4 transition-all duration-300 focus-ring border-b-4 ${
                    isActive
                      ? 'border-[var(--color-orange)]'
                      : 'border-transparent hover:border-[var(--color-border)]'
                  }`}
                  style={{ 
                    color: isActive ? 'var(--color-orange)' : 'var(--color-text-secondary)'
                  }}
                >
                  {item.icon}
                  <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
                </button>
                  );
                })}
                </div>
                
                {/* Spacer for balance */}
                <div className="w-[56px]"></div>
              </div>
            </div>
          </nav>

      {/* Mobile Navigation - Bottom (iOS/Android style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 shadow-lg border-t-2 z-50 safe-area-bottom transition-all duration-300"
           style={{
             backgroundColor: 'var(--color-elevated)',
             borderColor: 'var(--color-border)',
             boxShadow: 'var(--shadow-lg)'
           }}>
        <div className="flex justify-around items-center px-2 py-2 pb-safe">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-300 touch-target min-w-[60px] active:scale-95"
            style={{ color: 'var(--color-orange)' }}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            <span className="text-[10px] font-semibold uppercase tracking-wide">Theme</span>
          </button>
          
          {navItems.slice(0, 7).map((item) => {
            const isActive = currentScreen === item.screen;
            
            return (
              <button
                key={item.screen}
                onClick={() => setCurrentScreen(item.screen)}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-300 touch-target min-w-[60px] active:scale-95 ${
                  isActive ? 'scale-105' : ''
                }`}
                style={{
                  color: isActive ? 'var(--color-orange)' : 'var(--color-text-secondary)',
                  backgroundColor: isActive ? 'rgba(255, 107, 53, 0.1)' : 'transparent'
                }}
              >
                <div className={`${isActive ? 'scale-110' : ''} transition-all duration-300`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      
      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-20" />
    </>
  );
}

