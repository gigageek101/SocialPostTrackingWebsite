import { Calendar, Home, Users, Settings, List, FileText, BookOpen } from 'lucide-react';
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
    { screen: 'settings', icon: <Settings className="w-6 h-6" />, label: 'Settings' },
  ];

  return (
    <>
      {/* Desktop Navigation - Top */}
      <nav className="hidden md:block bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center gap-2">
            {navItems.map((item) => {
              const isActive = currentScreen === item.screen;
              
              return (
                <button
                  key={item.screen}
                  onClick={() => setCurrentScreen(item.screen)}
                  className={`flex flex-col items-center gap-1 px-8 py-4 smooth-transition focus-ring border-b-4 ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                  }`}
                >
                  {item.icon}
                  <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Bottom (iOS/Android style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t-2 border-gray-200 z-50 safe-area-bottom">
        <div className="flex justify-around items-center px-2 py-2 pb-safe">
          {navItems.map((item) => {
            const isActive = currentScreen === item.screen;
            
            return (
              <button
                key={item.screen}
                onClick={() => setCurrentScreen(item.screen)}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl smooth-transition touch-target min-w-[60px] active:scale-95 ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-400 active:bg-gray-100'
                }`}
              >
                <div className={`${isActive ? 'scale-110' : ''} smooth-transition`}>
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

