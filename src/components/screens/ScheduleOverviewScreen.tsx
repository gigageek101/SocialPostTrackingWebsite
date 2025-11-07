import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PostChecklistModal } from '../PostChecklistModal';
import { PlatformIcon } from '../ui/PlatformIcon';
import { CheckCircle, ExternalLink, RefreshCw, SkipForward, Clock, Timer } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ChecklistState } from '../../types';
import { format } from 'date-fns';
import { PLATFORM_NAMES, PLATFORM_COLORS } from '../../constants/platforms';
import { getAllPostsForShift, RecommendedPost } from '../../utils/dynamicScheduler';
import { formatCountdown } from '../../utils/timezone';

export function ScheduleOverviewScreen() {
  const { state, logPost, skipPost, setCurrentScreen, manualSync } = useApp();
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendedPost | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Force re-render when posts are logged
  useEffect(() => {
      setCurrentTime(new Date());
  }, [state.postLogs.length, state.accounts]);

  if (!state.userSettings || state.creators.length === 0 || state.accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <Card className="text-center p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome! 👋</h2>
            <p className="text-gray-600 mb-6">
              Let's get started by adding your creators and their platform accounts.
            </p>
            <Button onClick={() => setCurrentScreen('creators')}>
              Go to Creators
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Get today's post logs
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayPosts = state.postLogs.filter(log => {
    const logDate = format(new Date(log.timestampUTC), 'yyyy-MM-dd');
    return logDate === today;
  });

  // Determine current shift based on USER's local time
  const getUserShift = (): 'morning' | 'evening' => {
    const now = new Date();
    const userHour = now.getHours();
    return userHour < 14 ? 'morning' : 'evening';
  };

  const currentShift = getUserShift();
  
  // Get all posts for current shift
  const morningPosts = getAllPostsForShift(
    state.accounts,
    state.creators,
    state.userSettings,
    'morning',
    todayPosts
  );

  const eveningPosts = getAllPostsForShift(
    state.accounts,
    state.creators,
    state.userSettings,
    'evening',
    todayPosts
  );

  const currentShiftPosts = currentShift === 'morning' ? morningPosts : eveningPosts;
  const otherShiftPosts = currentShift === 'morning' ? eveningPosts : morningPosts;

  const handlePostNow = (recommendation: RecommendedPost) => {
    setSelectedRecommendation(recommendation);
    setShowChecklist(true);
  };

  const handleChecklistSubmit = (checklistState: ChecklistState, notes: string) => {
    if (selectedRecommendation) {
      const account = state.accounts.find(a => a.id === selectedRecommendation.accountId);
      
      if (account) {
        setShowChecklist(false);
        setSelectedRecommendation(null);
        logPost(
          undefined, 
          checklistState, 
          notes, 
          account.id, 
          account.platform,
          selectedRecommendation.postNumber
        );
        
        // Force refresh
        setTimeout(() => setCurrentTime(new Date()), 100);
      }
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await manualSync();
      setCurrentTime(new Date());
    } catch (err: any) {
      alert(`❌ Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const getOrdinal = (n: number) => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  };

  const renderPostCard = (rec: RecommendedPost) => {
    const account = state.accounts.find(a => a.id === rec.accountId);
    const creator = state.creators.find(c => c.id === account?.creatorId);
    if (!account || !creator) return null;

    const platformAccounts = state.accounts.filter(a => a.platform === rec.platform);
    const accountIndex = platformAccounts.findIndex(a => a.id === account.id) + 1;

    const isCompleted = rec.alreadyCompleted;
    const isSkipped = rec.skipped;
    const isPending = !isCompleted && !isSkipped;

    return (
      <Card 
        key={`${rec.accountId}-${rec.shift}-${rec.postNumber}`}
        className={`transition-all ${
          isCompleted 
            ? 'bg-green-50 border-2 border-green-200' 
            : isSkipped
            ? 'bg-yellow-50 border-2 border-yellow-200'
            : 'bg-white border-2 border-gray-200 hover:border-blue-300'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Platform and Account Info */}
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-3 rounded-lg ${PLATFORM_COLORS[rec.platform]}`}>
              <PlatformIcon platform={rec.platform} className="w-8 h-8" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-gray-900">
                  {PLATFORM_NAMES[rec.platform]} Account {accountIndex}
                </h3>
                <span className="text-sm px-2 py-1 bg-gray-100 rounded-full font-medium">
                  Post {rec.postNumber}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">{creator.name} • @{account.handle}</p>
              
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">US Time:</span>
                  <span className="font-medium text-gray-900">{rec.recommendedTimeCreatorTZ}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Your Time:</span>
                  <span className="font-medium text-gray-900">{rec.recommendedTimeUserTZ}</span>
                </div>
                
                {/* Cooldown indicator */}
                {isPending && rec.isDuringCooldown && rec.cooldownEndsInMinutes && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Timer className="w-4 h-4" />
                    <span className="font-medium">Cooldown: {formatCountdown(rec.cooldownEndsInMinutes)}</span>
                  </div>
                )}
                
                {/* Timing indicator */}
                {isPending && !rec.isDuringCooldown && (
                  <div className="flex items-center gap-2">
                    {rec.isPerfectTime ? (
                      <span className="text-green-600 font-medium">🎯 Perfect Time!</span>
                    ) : rec.isTooEarly ? (
                      <span className="text-amber-600 font-medium">
                        <Clock className="w-4 h-4 inline mr-1" />
                        In {formatCountdown(rec.minutesUntilRecommended)}
                      </span>
                    ) : rec.isTooLate ? (
                      <span className="text-red-600 font-medium">
                        Late by {formatCountdown(Math.abs(rec.minutesUntilRecommended))}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Media Link */}
              {isPending && account.telegramLink && (
                <div className="mt-3">
                  <a
                    href={account.telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-900 px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Media
                  </a>
                </div>
              )}

              {/* Caption preview for TikTok */}
              {isPending && rec.platform === 'tiktok' && (() => {
                const nextCaption = account.captions?.find(c => !c.used);
                if (nextCaption) {
                  return (
                    <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                      <div className="font-semibold text-purple-900 mb-1">Caption Ready</div>
                      <p className="text-purple-800 truncate">{nextCaption.title}</p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Right side - Status and Actions */}
          <div className="flex flex-col items-end gap-2">
            {isCompleted && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-6 h-6" />
                <span className="font-semibold">Done</span>
              </div>
            )}
            
            {isSkipped && (
              <div className="flex items-center gap-2 text-yellow-600">
                <SkipForward className="w-6 h-6" />
                <span className="font-semibold">Skipped</span>
              </div>
            )}
            
            {isPending && (
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => handlePostNow(rec)}
                  className="whitespace-nowrap"
                >
                  ✓ I Just Posted
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    skipPost(account.id, rec.platform, rec.postNumber, () => {
                      setCurrentTime(new Date());
                    });
                  }}
                  className="whitespace-nowrap"
                >
                  ⏭️ Skip
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const completedCount = currentShiftPosts.filter(p => p.alreadyCompleted).length;
  const skippedCount = currentShiftPosts.filter(p => p.skipped).length;
  const totalCount = currentShiftPosts.length;
  const pendingCount = totalCount - completedCount - skippedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Sync Button */}
        {state.authState?.isAuthenticated && (
          <div className="mb-4 flex justify-end">
            <Button
              onClick={handleManualSync}
              variant="secondary"
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from Cloud'}
            </Button>
          </div>
        )}

        {/* Header */}
        <Card className="shadow-xl mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="text-center">
            <h1 className="text-4xl font-black mb-2">
              {currentShift === 'morning' ? '🌅 Morning Shift' : '🌙 Evening Shift'}
                      </h1>
            <p className="text-lg text-indigo-100 mb-4">
              {format(currentTime, 'EEEE, MMMM d, yyyy • HH:mm:ss')}
            </p>
            
            {/* Progress */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div>
                <span className="font-bold text-2xl text-green-300">{completedCount}</span>
                <span className="text-indigo-200 ml-1">Completed</span>
                    </div>
              <div>
                <span className="font-bold text-2xl text-yellow-300">{skippedCount}</span>
                <span className="text-indigo-200 ml-1">Skipped</span>
                    </div>
              <div>
                <span className="font-bold text-2xl text-white">{pendingCount}</span>
                <span className="text-indigo-200 ml-1">Pending</span>
                    </div>
                  </div>

            {/* Progress bar */}
            <div className="mt-4 bg-indigo-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-green-400 h-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
                    </div>
                  </div>
        </Card>

        {/* Current Shift Posts */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📋 {currentShift === 'morning' ? 'Morning' : 'Evening'} Shift Checklist
          </h2>
          
          {currentShiftPosts.length === 0 ? (
            <Card className="text-center p-8">
              <p className="text-gray-600">No posts scheduled for this shift</p>
            </Card>
          ) : pendingCount === 0 ? (
            <Card className="text-center p-8 bg-green-50 border-2 border-green-200">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-900 mb-2">
                {currentShift === 'morning' ? 'Morning' : 'Evening'} Shift Complete! 🎉
              </h3>
              <p className="text-green-700">
                Great job! You've completed all posts for this shift.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {currentShiftPosts.map(rec => renderPostCard(rec))}
                      </div>
                    )}
                            </div>
                            
        {/* Other Shift Preview */}
        {otherShiftPosts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              👀 {currentShift === 'morning' ? 'Evening' : 'Morning'} Shift Preview
            </h2>
            <Card className="bg-gray-50">
              <p className="text-sm text-gray-600 mb-3">
                Coming up in the {currentShift === 'morning' ? 'evening' : 'morning'}:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {otherShiftPosts.slice(0, 8).map(rec => {
                  const account = state.accounts.find(a => a.id === rec.accountId);
                  const platformAccounts = state.accounts.filter(a => a.platform === rec.platform);
                  const accountIndex = platformAccounts.findIndex(a => a.id === account?.id) + 1;
                          
                          return (
                    <div 
                      key={`${rec.accountId}-${rec.shift}-${rec.postNumber}`}
                      className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg"
                    >
                                <PlatformIcon platform={rec.platform} className="w-4 h-4" />
                      <span className="font-medium text-gray-900">
                        {PLATFORM_NAMES[rec.platform]} {accountIndex}
                              </span>
                            </div>
                          );
                        })}
                      </div>
              {otherShiftPosts.length > 8 && (
                <p className="text-xs text-gray-500 mt-2">
                  +{otherShiftPosts.length - 8} more posts
                </p>
                  )}
            </Card>
                </div>
        )}

        {/* Quick Access */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="secondary"
            onClick={() => setCurrentScreen('scheduled-posts')}
            className="py-4"
          >
            📋 View Full Schedule
          </Button>
          <Button
            variant="secondary"
            onClick={() => setCurrentScreen('calendar')}
            className="py-4"
          >
            📅 View Calendar
          </Button>
        </div>
      </div>

      {/* Post Checklist Modal */}
      {selectedRecommendation && (
        <PostChecklistModal
          isOpen={showChecklist}
          onClose={() => {
            setShowChecklist(false);
            setSelectedRecommendation(null);
          }}
          platform={selectedRecommendation.platform}
          onSubmit={handleChecklistSubmit}
          postLabel={getOrdinal(selectedRecommendation.postNumber)}
          shift={selectedRecommendation.shift}
          todayPosts={todayPosts}
        />
      )}
    </div>
  );
}
