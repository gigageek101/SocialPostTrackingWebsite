import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PostChecklistModal } from '../PostChecklistModal';
import { TimesInfoModal } from '../TimesInfoModal';
import { UpcomingSlotCard } from '../UpcomingSlotCard';
import { Clock, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DailyPlanSlot, ChecklistState } from '../../types';
import { format } from 'date-fns';
import { PLATFORM_NAMES } from '../../constants/platforms';
import { getMinutesUntil, formatCountdown } from '../../utils/timezone';
import { showNotification } from '../../utils/helpers';

export function ScheduleOverviewScreen() {
  const { state, getTodayPlan, refreshDailyPlan, logPost, setCurrentScreen } = useApp();
  const [selectedSlot, setSelectedSlot] = useState<DailyPlanSlot | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showTimesInfo, setShowTimesInfo] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifiedSlots, setNotifiedSlots] = useState<Set<string>>(new Set());

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
      
      // Check for slots that just became ready and send notifications
      if (state.userSettings?.notificationsEnabled && todayPlan) {
        todayPlan.slots.forEach((slot) => {
          if (slot.status === 'pending' && !notifiedSlots.has(slot.id)) {
            const minutesUntil = getMinutesUntil(slot.scheduledTimeUTC);
            
            // Notify when it's time to post (within 1 minute window)
            if (minutesUntil <= 0 && minutesUntil > -1) {
              const platformAccounts = state.accounts.filter((a) => a.platform === slot.platform);
              const accountIndex = platformAccounts.findIndex((a) => a.id === slot.accountId) + 1;
              const platformName = PLATFORM_NAMES[slot.platform];
              
              showNotification(
                `🚀 Time to Post!`,
                `${platformName} ${accountIndex} is ready for posting now!`,
                () => window.focus()
              );
              
              setNotifiedSlots((prev) => new Set(prev).add(slot.id));
            }
          }
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.userSettings, todayPlan, notifiedSlots, state.accounts]);

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

  // Get all relevant upcoming slots (pending or on cooldown, within next 4 hours)
  const upcomingSlots = todayPlan?.slots
    .filter((s) => {
      if (s.status === 'posted' || s.status === 'skipped') return false;
      const minutesUntil = getMinutesUntil(s.scheduledTimeUTC);
      // Show slots that are due or within next 4 hours
      return minutesUntil < 240;
    })
    .sort((a, b) => a.scheduledTimeUTC.localeCompare(b.scheduledTimeUTC)) || [];

  // Get the primary next action slot (first ready one, or first upcoming)
  const nextSlot = upcomingSlots.find((s) => {
    const minutesUntil = getMinutesUntil(s.scheduledTimeUTC);
    return minutesUntil <= 0;
  }) || upcomingSlots[0];

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
      <div className="max-w-4xl mx-auto py-8">
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

        {/* Current Time Display */}
        <Card className="shadow-lg mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Clock className="w-4 h-4" />
            <span>Current Time</span>
          </div>
          <div className="text-5xl font-bold text-gray-900 mb-1">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm text-gray-600">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </div>
        </Card>

        {/* Legend */}
        <div className="flex justify-center gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Ready Now</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span>On Cooldown</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            <span>Upcoming</span>
          </div>
        </div>

        {/* Main Next Post Card */}
        {nextSlot && (
          <Card className="shadow-2xl border-4 border-white mb-6">
            <div className="text-center">
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
                className={`text-2xl px-12 py-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all ${
                  isReady ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
              >
                {isReady ? '🚀 Clock In for Posting' : '⏱️ Wait for Scheduled Time'}
              </Button>
            </div>
          </Card>
        )}

        {/* Upcoming Posts List */}
        {upcomingSlots.length > 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-700 mb-3">Coming Up Next</h2>
            {upcomingSlots.slice(1, 6).map((slot) => {
              const { account: acc, creator: cre, accountIndex: idx } = getAccountInfo(slot);
              if (!acc || !cre) return null;
              
              return (
                <UpcomingSlotCard
                  key={slot.id}
                  slot={slot}
                  account={acc}
                  creator={cre}
                  accountIndex={idx}
                  onClick={() => {
                    const mins = getMinutesUntil(slot.scheduledTimeUTC);
                    if (mins <= 0) handleClockIn(slot);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-8 flex justify-center gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-green-600">
              {todayPlan?.slots.filter((s) => s.status === 'posted').length || 0}
            </div>
            <div className="text-sm text-gray-600 font-semibold">Completed</div>
          </div>
          <div className="w-px bg-gray-300" />
          <div>
            <div className="text-4xl font-bold text-blue-600">
              {upcomingSlots.length}
            </div>
            <div className="text-sm text-gray-600 font-semibold">Upcoming</div>
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
