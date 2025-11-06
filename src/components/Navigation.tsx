import { Calendar, Home, Users, Settings, List, FileText, BookOpen, UserCog } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Screen } from '../types';

export function Navigation() {
  const { currentScreen, setCurrentScreen } = useApp();

  const navItems: Array<{ screen: Screen; icon: React.ReactNode; label: string }> = [
    { screen: 'schedule-overview', icon: <Home className="w-6 h-6" />, label: 'Today' },
    { screen: 'scheduled-posts', icon: <List className="w-6 h-6" />, label: 'Schedule' },
    { screen: 'content', icon: <FileText className="w-6 h-6" />, label: 'Content' },
    { screen: 'workflow', icon: <BookOpen className="w-6 h-6" />, label: 'Workflow' },
    { screen: 'calendar', icon: <Calendar className="w-6 h-6" />, label: 'Calendar' },
    { screen: 'creators', icon: <Users className="w-6 h-6" />, label: 'Creators' },
    { screen: 'creator-settings', icon: <UserCog className="w-6 h-6" />, label: 'Creator' },
    { screen: 'settings', icon: <Settings className="w-6 h-6" />, label: 'Settings' },
  ];

  return (
    <>
          {/* Desktop Navigation - Top */}
          <nav className="hidden md:block glass-effect shadow-luxury border-b-2 border-mandarin/20 sticky top-0 z-40 animate-slide-in">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-center items-center gap-2">
            {navItems.map((item) => {
              const isActive = currentScreen === item.screen;
              
              return (
                <button
                  key={item.screen}
                  onClick={() => setCurrentScreen(item.screen)}
                  className={`flex flex-col items-center gap-2 px-8 py-5 luxury-transition focus-ring border-b-4 rounded-t-xl ${
                    isActive
                      ? 'border-mandarin text-mandarin bg-mandarin/10 shadow-glow-mandarin'
                      : 'border-transparent text-gray-400 hover:text-mandarin-light hover:bg-dark-elevated hover:border-mandarin/30'
                  }`}
                >
                  {item.icon}
                  <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                </button>
                  );
                })}
                </div>
            </div>
          </nav>

      {/* Mobile Navigation - Bottom (iOS/Android style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-effect shadow-luxury border-t-2 border-mandarin/20 z-50 safe-area-bottom animate-slide-up">
        <div className="flex justify-around items-center px-2 py-3 pb-safe">
          {navItems.map((item) => {
            const isActive = currentScreen === item.screen;
            
            return (
              <button
                key={item.screen}
                onClick={() => setCurrentScreen(item.screen)}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-2xl luxury-transition touch-target min-w-[60px] active:scale-95 border-2 ${
                  isActive
                    ? 'text-mandarin bg-mandarin/10 border-mandarin shadow-glow-mandarin'
                    : 'text-gray-400 border-transparent active:bg-dark-elevated'
                }`}
              >
                <div className={`${isActive ? 'scale-110 animate-float' : ''} luxury-transition`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'font-black' : ''}`}>
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

