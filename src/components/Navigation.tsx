import { Calendar, Home, Users, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Screen } from '../types';

export function Navigation() {
  const { currentScreen, setCurrentScreen } = useApp();

  const navItems: Array<{ screen: Screen; icon: React.ReactNode; label: string }> = [
    { screen: 'schedule-overview', icon: <Home className="w-6 h-6" />, label: 'Today' },
    { screen: 'calendar', icon: <Calendar className="w-6 h-6" />, label: 'Calendar' },
    { screen: 'creators', icon: <Users className="w-6 h-6" />, label: 'Creators' },
    { screen: 'settings', icon: <Settings className="w-6 h-6" />, label: 'Settings' },
  ];

  return (
    <nav className="bg-white shadow-lg rounded-xl p-2 mb-6">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = currentScreen === item.screen;
          
          return (
            <button
              key={item.screen}
              onClick={() => setCurrentScreen(item.screen)}
              className={`flex flex-col items-center gap-1 px-6 py-3 rounded-lg smooth-transition focus-ring ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

