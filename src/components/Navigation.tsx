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
    <nav className="bg-white shadow-sm border-b border-gray-200">
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
  );
}

