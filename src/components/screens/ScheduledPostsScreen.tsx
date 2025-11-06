import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { PlatformIcon } from '../ui/PlatformIcon';
import { PLATFORM_NAMES } from '../../constants/platforms';
import { format } from 'date-fns';
import { Clock, CheckCircle, Circle } from 'lucide-react';
import { DailyPlanSlot } from '../../types';

export function ScheduledPostsScreen() {
  const { state, getTodayPlan } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayPlan = getTodayPlan();
  
  if (!todayPlan || !state.userSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto py-8">
          <Card className="text-center p-8">
            <p className="text-gray-600">No schedule available. Please add creators and accounts first.</p>
          </Card>
        </div>
      </div>
    );
  }

  // Separate slots by shift (morning/evening based on scheduled time)
  const morningSlots: DailyPlanSlot[] = [];
  const eveningSlots: DailyPlanSlot[] = [];

  todayPlan.slots.forEach(slot => {
    const scheduledDate = new Date(slot.scheduledTimeUTC);
    const hour = scheduledDate.getUTCHours();
    
    // Morning shift: before 14:00 UTC, Evening: 14:00 and after
    if (hour < 14) {
      morningSlots.push(slot);
    } else {
      eveningSlots.push(slot);
    }
  });

  // Sort by scheduled time
  morningSlots.sort((a, b) => a.scheduledTimeUTC.localeCompare(b.scheduledTimeUTC));
  eveningSlots.sort((a, b) => a.scheduledTimeUTC.localeCompare(b.scheduledTimeUTC));


  const renderShiftTable = (slots: DailyPlanSlot[], shiftName: string) => {
    if (slots.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No posts scheduled for {shiftName.toLowerCase()}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Platform</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Account</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Recommended Time</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Actual Post Time</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Timing</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const account = state.accounts.find(a => a.id === slot.accountId);
              const creator = state.creators.find(c => c.id === account?.creatorId);
              if (!account || !creator) return null;

              const platformAccounts = state.accounts.filter(a => a.platform === slot.platform);
              const accountIndex = platformAccounts.findIndex(a => a.id === slot.accountId) + 1;

              const isPosted = slot.status === 'posted';
              
              // Find the actual post log if posted
              const postLog = isPosted && slot.postLogId 
                ? state.postLogs.find(log => log.id === slot.postLogId)
                : null;
              
              // Calculate timing difference if posted
              let timingInfo = { text: '-', color: 'text-gray-400' };
              if (postLog) {
                const scheduledTime = new Date(slot.scheduledTimeUTC);
                const actualTime = new Date(postLog.timestampUTC);
                const diffMinutes = Math.round((actualTime.getTime() - scheduledTime.getTime()) / 1000 / 60);
                
                if (diffMinutes >= -15 && diffMinutes <= 15) {
                  timingInfo = { text: '🎯 Perfect', color: 'text-green-600 font-bold' };
                } else if (diffMinutes < -15) {
                  timingInfo = { text: `⚠️ ${Math.abs(diffMinutes)}min early`, color: 'text-amber-600 font-semibold' };
                } else {
                  timingInfo = { text: `⚠️ ${diffMinutes}min late`, color: 'text-red-600 font-semibold' };
                }
              }

              return (
                <tr key={slot.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isPosted ? 'bg-green-50' : ''}`}>
                  <td className="py-3 px-4">
                    {isPosted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={slot.platform} className="w-6 h-6" />
                      <span className="font-semibold text-gray-900">
                        {PLATFORM_NAMES[slot.platform]} {accountIndex}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{creator.name}</p>
                      <p className="text-xs text-gray-500">@{account.handle}</p>
                      <p className="text-xs text-blue-600">📱 {account.device}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-mono font-semibold text-gray-900">
                        {slot.scheduledTimeCreatorTZ}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{creator.timezone.split('/')[1]} (Recommended)</p>
                  </td>
                  <td className="py-3 px-4">
                    {postLog ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="font-mono font-semibold text-green-900">
                            {postLog.timestampCreatorTZ}
                          </span>
                        </div>
                        <p className="text-xs text-green-600">Posted successfully</p>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        Not posted yet
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${timingInfo.color}`}>
                      {timingInfo.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const morningPostedCount = morningSlots.filter(s => s.status === 'posted').length;
  const eveningPostedCount = eveningSlots.filter(s => s.status === 'posted').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Scheduled Posts Today</h1>
          <p className="text-gray-600">
            {format(currentTime, 'EEEE, MMMM d, yyyy')} • {format(currentTime, 'HH:mm:ss')}
          </p>
        </div>

        {/* Morning Shift */}
        <Card className="shadow-lg mb-6">
          <div className="border-b-4 border-amber-400 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  🌅 Morning Shift
                </h2>
                <p className="text-sm text-gray-600 mt-1">Before 2:00 PM (Creator timezone)</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-amber-600">
                  {morningPostedCount}/{morningSlots.length}
                </div>
                <p className="text-xs text-gray-600">Posts Completed</p>
              </div>
            </div>
          </div>
          {renderShiftTable(morningSlots, 'Morning Shift')}
        </Card>

        {/* Evening Shift */}
        <Card className="shadow-lg">
          <div className="border-b-4 border-purple-400 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  🌙 Evening Shift
                </h2>
                <p className="text-sm text-gray-600 mt-1">After 2:00 PM (Creator timezone)</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-purple-600">
                  {eveningPostedCount}/{eveningSlots.length}
                </div>
                <p className="text-xs text-gray-600">Posts Completed</p>
              </div>
            </div>
          </div>
          {renderShiftTable(eveningSlots, 'Evening Shift')}
        </Card>
      </div>
    </div>
  );
}

