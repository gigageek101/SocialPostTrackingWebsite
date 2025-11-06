import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PostChecklistModal } from '../PostChecklistModal';
import { TimesInfoModal } from '../TimesInfoModal';
import { UpcomingSlotCard } from '../UpcomingSlotCard';
import { WorkflowInfo } from '../WorkflowInfo';
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
    // Show checklist - post will be logged with interactions
    setSelectedSlot(slot);
    setShowChecklist(true);
  };

  const handleChecklistSubmit = (checklistState: ChecklistState, notes: string) => {
    if (selectedSlot) {
      // Post was already logged when button was clicked, just save checklist
      logPost(selectedSlot.id, checklistState, notes);
      setShowChecklist(false);
      setSelectedSlot(null);
      
      // Refresh to show next post
      setTimeout(() => refreshDailyPlan(), 100);
    }
  };

  // Get all relevant upcoming slots (only future posts)
  const upcomingSlots = todayPlan?.slots
    .filter((s) => {
      if (s.status === 'posted' || s.status === 'skipped') return false;
      const minutesUntil = getMinutesUntil(s.scheduledTimeUTC);
      // Only show future posts (not past ones)
      return minutesUntil > -10; // Allow 10 minute grace period
    })
    .sort((a, b) => a.scheduledTimeUTC.localeCompare(b.scheduledTimeUTC)) || [];

  // Get the primary next action slot (closest upcoming post)
  const nextSlot = upcomingSlots[0];

  // Get account info with shift tracking
  const getAccountInfo = (slot: DailyPlanSlot) => {
    const account = state.accounts.find((a) => a.id === slot.accountId);
    const creator = state.creators.find((c) => c.id === account?.creatorId);
    
    // Count accounts of same platform for numbering
    const platformAccounts = state.accounts.filter((a) => a.platform === slot.platform);
    const accountIndex = platformAccounts.findIndex((a) => a.id === slot.accountId) + 1;
    
    // Determine shift and post number within shift
    const scheduledHour = new Date(slot.scheduledTimeUTC).getUTCHours();
    const isEvening = scheduledHour >= 14; // 14:00 UTC+ is evening
    const shift = isEvening ? 'evening' : 'morning';
    
    // Count which post this is in the shift for this account/platform
    const accountSlots = todayPlan?.slots.filter(
      (s) => s.accountId === slot.accountId && s.platform === slot.platform
    ) || [];
    
    const sortedSlots = accountSlots.sort((a, b) => 
      a.scheduledTimeUTC.localeCompare(b.scheduledTimeUTC)
    );
    
    const slotIndex = sortedSlots.findIndex((s) => s.id === slot.id);
    
    // Determine post number in shift
    let postNumberInShift = 1;
    let shiftPostCount = 1;
    
    if (slot.platform === 'tiktok' || slot.platform === 'threads') {
      // 3 morning, 3 evening
      if (slotIndex >= 3) {
        postNumberInShift = slotIndex - 2; // Evening: 1, 2, 3
      } else {
        postNumberInShift = slotIndex + 1; // Morning: 1, 2, 3
      }
      shiftPostCount = 3;
    } else if (slot.platform === 'instagram' || slot.platform === 'facebook') {
      // 1 morning, 1 evening (or 2 morning, 2 evening for FB)
      postNumberInShift = 1;
      shiftPostCount = slot.platform === 'facebook' ? 2 : 1;
    }
    
    return { account, creator, accountIndex, shift, postNumberInShift, shiftPostCount };
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

  const { account, creator, accountIndex, shift, postNumberInShift } = getAccountInfo(nextSlot);
  if (!account || !creator) return null;

  const minutesUntil = getMinutesUntil(nextSlot.scheduledTimeUTC);
  const isReady = minutesUntil <= 0 && minutesUntil > -10;
  const platformName = PLATFORM_NAMES[nextSlot.platform];
  
  // Get ordinal for post number
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  const postLabel = postNumberInShift === 1 ? 'First' : 
                    postNumberInShift === 2 ? 'Second' : 
                    postNumberInShift === 3 ? 'Third' : 
                    getOrdinal(postNumberInShift);

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

        {/* Workflow Info */}
        <WorkflowInfo />

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
              
              <div className="flex items-center justify-center gap-4 mb-4">
                {creator.profilePicture && (
                  <img 
                    src={creator.profilePicture} 
                    alt={creator.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                )}
                <div>
                  <h1 className="text-5xl font-black text-gray-900">
                    {platformName} {accountIndex}
                  </h1>
                  <p className="text-xl text-gray-600">
                    {creator.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 mb-6 text-sm">
                <div className="px-4 py-2 bg-gray-100 rounded-lg">
                  <span className="text-gray-600">Username: </span>
                  <span className="font-semibold text-gray-900">{account.handle}</span>
                </div>
                <div className="px-4 py-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600">📱 </span>
                  <span className="font-semibold text-blue-900">{account.device}</span>
                </div>
              </div>

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

              {/* Post Button */}
              <Button
                onClick={() => handleClockIn(nextSlot)}
                disabled={!isReady}
                size="lg"
                className={`text-2xl px-12 py-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all ${
                  isReady ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
              >
                {isReady 
                  ? `✓ I Just Made ${postLabel} Post of ${shift.charAt(0).toUpperCase() + shift.slice(1)} Shift` 
                  : '⏱️ Wait for Scheduled Time'}
              </Button>
              
              {/* Cooldown info for platforms that need it */}
              {(nextSlot.platform === 'tiktok' || nextSlot.platform === 'threads') && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>⏱️ 2-Hour Cooldown:</strong> Timer starts immediately when you click the button above.
                    Complete your interactions while waiting for the next post window.
                  </p>
                </div>
              )}
              
              {/* Next post info */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Next in workflow:</strong>{' '}
                  {upcomingSlots
                    .slice(1, 2)
                    .map((s) => {
                      const { accountIndex: nextIdx } = getAccountInfo(s);
                      const nextPlatform = PLATFORM_NAMES[s.platform];
                      const mins = getMinutesUntil(s.scheduledTimeUTC);
                      return (
                        <span key={s.id}>
                          {nextPlatform} {nextIdx} in <span className="font-bold">{formatCountdown(mins)}</span>
                        </span>
                      );
                    })}
                </p>
              </div>
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
          postLabel={(() => {
            const info = getAccountInfo(selectedSlot);
            return info.postNumberInShift === 1 ? 'First' : 
                   info.postNumberInShift === 2 ? 'Second' : 
                   info.postNumberInShift === 3 ? 'Third' : 
                   `${info.postNumberInShift}th`;
          })()}
          shift={getAccountInfo(selectedSlot).shift}
        />
      )}

      <TimesInfoModal
        isOpen={showTimesInfo}
        onClose={() => setShowTimesInfo(false)}
      />
    </div>
  );
}
