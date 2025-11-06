import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PostChecklistModal } from '../PostChecklistModal';
import { TimesInfoModal } from '../TimesInfoModal';
import { Clock, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DailyPlanSlot, ChecklistState } from '../../types';
import { format } from 'date-fns';
import { PLATFORM_NAMES } from '../../constants/platforms';
import { getMinutesUntil, formatCountdown } from '../../utils/timezone';

export function ScheduleOverviewScreen() {
  const { state, getTodayPlan, refreshDailyPlan, logPost, setCurrentScreen } = useApp();
  const [selectedSlot, setSelectedSlot] = useState<DailyPlanSlot | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showTimesInfo, setShowTimesInfo] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const todayPlan = getTodayPlan();

  useEffect(() => {
    refreshDailyPlan();
    
    // Show times popup on first load if not hidden
    if (state.userSettings && !state.userSettings.hideTimesPopup) {
      setShowTimesInfo(true);
    }
  }, []);

  useEffect(() => {
    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClockIn = (slot: DailyPlanSlot) => {
    setSelectedSlot(slot);
    setShowChecklist(true);
  };

  const handleChecklistSubmit = (checklistState: ChecklistState, notes: string) => {
    if (selectedSlot) {
      logPost(selectedSlot.id, checklistState, notes);
      setShowChecklist(false);
      setSelectedSlot(null);
    }
  };

  // Get next pending slot
  const nextSlot = todayPlan?.slots
    .filter((s) => s.status === 'pending')
    .sort((a, b) => a.scheduledTimeUTC.localeCompare(b.scheduledTimeUTC))[0];

  // Get account info
  const getAccountInfo = (slot: DailyPlanSlot) => {
    const account = state.accounts.find((a) => a.id === slot.accountId);
    const creator = state.creators.find((c) => c.id === account?.creatorId);
    
    // Count accounts of same platform for numbering
    const platformAccounts = state.accounts.filter((a) => a.platform === slot.platform);
    const accountIndex = platformAccounts.findIndex((a) => a.id === slot.accountId) + 1;
    
    return { account, creator, accountIndex };
  };

  if (!state.userSettings) return null;

  if (state.accounts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Accounts Yet</h2>
          <p className="text-gray-600 mb-6">
            Add creators and their accounts to start posting
          </p>
          <Button onClick={() => setCurrentScreen('creators')} size="lg">
            Add Accounts
          </Button>
        </Card>
      </div>
    );
  }

  if (!nextSlot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">All Done! 🎉</h2>
          <p className="text-gray-600">
            You've completed all scheduled posts for today.
          </p>
        </Card>
      </div>
    );
  }

  const { account, creator, accountIndex } = getAccountInfo(nextSlot);
  if (!account || !creator) return null;

  const minutesUntil = getMinutesUntil(nextSlot.scheduledTimeUTC);
  const isReady = minutesUntil <= 0;
  const platformName = PLATFORM_NAMES[nextSlot.platform];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-3xl mx-auto py-8">
        {/* Info Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowTimesInfo(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all"
          >
            <Info className="w-4 h-4" />
            View Posting Times
          </button>
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl border-4 border-white">
          {/* Current Time Display */}
          <div className="text-center mb-8 pb-8 border-b-2 border-gray-100">
            <div className="inline-flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Clock className="w-4 h-4" />
              <span>Current Time</span>
            </div>
            <div className="text-6xl font-bold text-gray-900 mb-2">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-lg text-gray-600">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </div>
          </div>

          {/* Next Task */}
          <div className="text-center mb-8">
            <div className="inline-block px-6 py-2 bg-blue-100 text-blue-900 rounded-full text-sm font-semibold mb-4">
              NEXT POST
            </div>
            
            <h1 className="text-5xl font-black text-gray-900 mb-2">
              {platformName} {accountIndex}
            </h1>
            
            <p className="text-xl text-gray-600 mb-6">
              {creator.name}
            </p>

            {/* Time Info */}
            <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto mb-8">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
                <div className="text-sm text-blue-600 font-semibold mb-2">Creator Time</div>
                <div className="text-3xl font-bold text-blue-900">
                  {nextSlot.scheduledTimeCreatorTZ}
                </div>
                <div className="text-xs text-blue-600 mt-1">{creator.timezone.split('/')[1]}</div>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                <div className="text-sm text-green-600 font-semibold mb-2">Your Time</div>
                <div className="text-3xl font-bold text-green-900">
                  {nextSlot.scheduledTimeUserTZ}
                </div>
                <div className="text-xs text-green-600 mt-1">{state.userSettings.userTimezone.split('/')[1]}</div>
              </div>
            </div>

            {/* Countdown or Ready */}
            {!isReady ? (
              <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-2xl mb-6">
                <div className="text-sm text-amber-600 font-semibold mb-2">Time Until Post</div>
                <div className="text-5xl font-black text-amber-900">
                  {formatCountdown(minutesUntil)}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl mb-6 animate-pulse">
                <div className="text-2xl font-bold text-green-900">
                  ✓ Ready to Post Now!
                </div>
              </div>
            )}

            {/* Clock In Button */}
            <Button
              onClick={() => handleClockIn(nextSlot)}
              disabled={!isReady}
              size="lg"
              className="text-2xl px-12 py-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
            >
              {isReady ? '🚀 Clock In for Posting' : '⏱️ Wait for Scheduled Time'}
            </Button>

            {!isReady && (
              <p className="text-sm text-gray-500 mt-4">
                The clock-in button will activate at the scheduled time
              </p>
            )}
          </div>
        </Card>

        {/* Stats Footer */}
        <div className="mt-6 flex justify-center gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-gray-900">
              {todayPlan?.slots.filter((s) => s.status === 'posted').length || 0}
            </div>
            <div className="text-sm text-gray-600">Completed Today</div>
          </div>
          <div className="w-px bg-gray-300" />
          <div>
            <div className="text-3xl font-bold text-gray-900">
              {todayPlan?.slots.filter((s) => s.status === 'pending').length || 0}
            </div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedSlot && (
        <PostChecklistModal
          isOpen={showChecklist}
          onClose={() => {
            setShowChecklist(false);
            setSelectedSlot(null);
          }}
          platform={selectedSlot.platform}
          onSubmit={handleChecklistSubmit}
        />
      )}

      <TimesInfoModal
        isOpen={showTimesInfo}
        onClose={() => setShowTimesInfo(false)}
      />
    </div>
  );
}
