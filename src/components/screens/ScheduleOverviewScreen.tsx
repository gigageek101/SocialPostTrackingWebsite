import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PostChecklistModal } from '../PostChecklistModal';
import { BackdatePostModal } from '../BackdatePostModal';
import { PostCard } from '../PostCard';
import { PlatformIcon } from '../ui/PlatformIcon';
import { CheckCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ChecklistState } from '../../types';
import { format } from 'date-fns';
import { PLATFORM_NAMES } from '../../constants/platforms';
import { getAllPostsForShift, RecommendedPost } from '../../utils/dynamicScheduler';

export function ScheduleOverviewScreen() {
  const { state, logPost, updatePost, skipPost, setCurrentScreen, manualSync } = useApp();
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendedPost | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showBackdateModal, setShowBackdateModal] = useState(false);
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

  // Get today's post logs (in user's timezone)
  const now = new Date();
  const todayInUserTZ = now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: state.userSettings!.userTimezone,
  }).split('/').reverse().join('-').replace(/(\d+)-(\d+)-(\d+)/, '$3-$1-$2');
  
  const todayPosts = state.postLogs.filter(log => {
    // Get the post date in user's timezone
    const postDateInUserTZ = new Date(log.timestampUTC).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: state.userSettings!.userTimezone,
    }).split('/').reverse().join('-').replace(/(\d+)-(\d+)-(\d+)/, '$3-$1-$2');
    
    return postDateInUserTZ === todayInUserTZ;
  });

  // Determine current shift based on USER's selected timezone
  const getUserShift = (): 'morning' | 'evening' => {
    const now = new Date();
    // Get hour in user's timezone
    const userHour = parseInt(
      now.toLocaleString('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: state.userSettings!.userTimezone,
      })
    );
    return userHour < 12 ? 'morning' : 'evening';
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
    const account = state.accounts.find(a => a.id === recommendation.accountId);
    
    if (account) {
      // Log post immediately to start cooldown
      const quickChecklistState: ChecklistState = {
        platform: account.platform,
        items: [],
        modified: false,
      };
      
      logPost(
        undefined,
        quickChecklistState,
        'Post in progress...',
        account.id,
        account.platform,
        recommendation.postNumber
      );
      
      // Force refresh to show cooldown
      setTimeout(() => setCurrentTime(new Date()), 100);
      
      // Then open checklist modal
      setSelectedRecommendation(recommendation);
      setShowChecklist(true);
    }
  };

  const handlePostEarlier = (recommendation: RecommendedPost) => {
    setSelectedRecommendation(recommendation);
    setShowBackdateModal(true);
  };

  const handleBackdateSubmit = (customTime: Date, postLink: string) => {
    if (selectedRecommendation) {
      const account = state.accounts.find(a => a.id === selectedRecommendation.accountId);
      
      if (account) {
        setShowBackdateModal(false);
        
        // Create a simple checklist state for backdated posts
        const checklistState: ChecklistState = {
          platform: account.platform,
          items: [],
          modified: false,
        };
        
        logPost(
          undefined,
          checklistState,
          `Posted earlier at ${format(customTime, 'MMM d, h:mm a')}`,
          account.id,
          account.platform,
          selectedRecommendation.postNumber,
          customTime,
          postLink
        );
        
        setSelectedRecommendation(null);
        
        // Force refresh
        setTimeout(() => setCurrentTime(new Date()), 100);
      }
    }
  };

  const handleChecklistSubmit = (checklistState: ChecklistState, notes: string) => {
    if (selectedRecommendation) {
      const account = state.accounts.find(a => a.id === selectedRecommendation.accountId);
      
      if (account) {
        // Update the existing post with checklist data
        updatePost(
          account.id,
          selectedRecommendation.postNumber,
          checklistState,
          notes
        );
        
        setShowChecklist(false);
        setSelectedRecommendation(null);
        
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
              {currentShiftPosts.map(rec => {
                const account = state.accounts.find(a => a.id === rec.accountId);
                const creator = state.creators.find(c => c.id === account?.creatorId);
                if (!account || !creator) return null;

                const platformAccounts = state.accounts.filter(a => a.platform === rec.platform);
                const accountIndex = platformAccounts.findIndex(a => a.id === account.id) + 1;

                return (
                  <PostCard
                    key={`${rec.accountId}-${rec.shift}-${rec.postNumber}`}
                    rec={rec}
                    account={account}
                    creator={creator}
                    accountIndex={accountIndex}
                    postLogs={state.postLogs}
                    onPostNow={() => handlePostNow(rec)}
                    onPostEarlier={() => handlePostEarlier(rec)}
                    onSkip={() => {
                      skipPost(account.id, rec.platform, rec.postNumber, () => {
                        setCurrentTime(new Date());
                      });
                    }}
                  />
                );
              })}
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
            onClick={() => setCurrentScreen('schedule-history')}
            className="py-4"
          >
            📅 View History
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

      {/* Backdate Post Modal */}
      {selectedRecommendation && (
        <BackdatePostModal
          isOpen={showBackdateModal}
          onClose={() => {
            setShowBackdateModal(false);
            setSelectedRecommendation(null);
          }}
          onSubmit={handleBackdateSubmit}
          platformName={PLATFORM_NAMES[selectedRecommendation.platform]}
          accountName={state.accounts.find(a => a.id === selectedRecommendation.accountId)?.handle || ''}
          postNumber={selectedRecommendation.postNumber}
        />
      )}
    </div>
  );
}
