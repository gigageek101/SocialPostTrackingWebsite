import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PostChecklistModal } from '../PostChecklistModal';
import { PlatformIcon } from '../ui/PlatformIcon';
import { CheckCircle, ExternalLink, Copy, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ChecklistState } from '../../types';
import { format } from 'date-fns';
import { PLATFORM_NAMES, COOLDOWN_MINUTES } from '../../constants/platforms';
import { getAllRecommendedPosts, RecommendedPost } from '../../utils/dynamicScheduler';
import { formatCountdown, getMinutesUntil } from '../../utils/timezone';
import { sendTelegramNotification, formatPostReadyNotification } from '../../services/telegramService';
import { hasNotificationBeenSent, markNotificationAsSent, generateNotificationKey, clearOldNotifications } from '../../utils/notificationTracker';

export function ScheduleOverviewScreen() {
  const { state, logPost, skipPost, setCurrentScreen, manualSync } = useApp();
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendedPost | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRecommendationId, setLastRecommendationId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Update current time every second (also triggers recommendations refresh)
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Clear old notifications daily
  useEffect(() => {
    clearOldNotifications();
    const dailyClear = setInterval(() => {
      clearOldNotifications();
    }, 24 * 60 * 60 * 1000); // Once per day
    return () => clearInterval(dailyClear);
  }, []);

  // Check for posts that are ready and send Telegram notifications
  useEffect(() => {
    if (!state.accounts.length || !state.creators.length || !state.userSettings) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayPosts = state.postLogs.filter(log => {
      const logDate = format(new Date(log.timestampUTC), 'yyyy-MM-dd');
      return logDate === today;
    });

    const recommendations = getAllRecommendedPosts(
      state.accounts,
      state.creators,
      state.userSettings,
      todayPosts
    );

    // Check each recommendation to see if it's ready (within 5 minutes of recommended time or overdue)
    recommendations.forEach(rec => {
      const recTimeUTC = new Date(rec.recommendedTimeUTC);
      const minutesUntil = Math.floor(
        (recTimeUTC.getTime() - currentTime.getTime()) / 1000 / 60
      );

      // If post is ready (within 5 minutes or past due) and not in cooldown
      if (!rec.isDuringCooldown && minutesUntil <= 5 && minutesUntil >= -30) {
        const account = state.accounts.find(a => a.id === rec.accountId);
        if (!account) return;

        const creator = state.creators.find(c => c.id === account.creatorId);
        if (!creator?.telegramBotToken || !creator?.telegramChatId) return;

        // Generate notification key
        const notificationKey = generateNotificationKey(
          'post-ready',
          rec.accountId,
          rec.shift,
          rec.postNumber,
          today
        );

        // Only send if not already sent
        if (!hasNotificationBeenSent(notificationKey)) {
          console.log(`📨 Sending Telegram notification for ${account.platform} @${account.handle}`);
          
          sendTelegramNotification(
            creator.telegramBotToken,
            creator.telegramChatId,
            {
              text: formatPostReadyNotification(
                account.platform,
                account.handle,
                rec.postNumber,
                rec.shift,
                rec.recommendedTimeCreatorTZ,
                rec.recommendedTimeUserTZ
              ),
              parseMode: 'HTML',
            }
          ).then(result => {
            if (result.success) {
              markNotificationAsSent(notificationKey);
              console.log(`✅ Telegram notification sent for ${account.platform} @${account.handle}`);
            } else {
              console.error(`❌ Failed to send Telegram notification: ${result.error}`);
            }
          }).catch(err => {
            console.error('Failed to send Telegram notification:', err);
          });
        }
      }
    });
  }, [currentTime, state.accounts, state.postLogs, state.creators, state.userSettings]);
  
  // Force re-render when posts are logged to immediately show next recommendation
  useEffect(() => {
    // SUPER AGGRESSIVE refresh
    setCurrentTime(new Date()); // Immediate
    
    const timer1 = setTimeout(() => {
      setCurrentTime(new Date());
    }, 50);
    
    const timer2 = setTimeout(() => {
      setCurrentTime(new Date());
    }, 150);
    
    const timer3 = setTimeout(() => {
      setCurrentTime(new Date());
    }, 300);
    
    const timer4 = setTimeout(() => {
      setCurrentTime(new Date());
    }, 500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [state.postLogs.length, state.accounts]); // Also watch accounts for caption changes

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

  // Get all recommended posts using dynamic scheduler
  // Dependencies: accounts, creators, userSettings, todayPosts (includes skipped posts)
  const recommendations = getAllRecommendedPosts(
    state.accounts,
    state.creators,
    state.userSettings,
    todayPosts
  );

  // Get the next recommendation (earliest one)
  // Force recalculation when postLogs change (including after skip)
  const nextRecommendation = recommendations.length > 0 ? recommendations[0] : null;
  
  // Track recommendation changes for debugging
  useEffect(() => {
    if (nextRecommendation) {
      const currentId = `${nextRecommendation.accountId}-${nextRecommendation.shift}-${nextRecommendation.postNumber}`;
      if (currentId !== lastRecommendationId) {
        console.log('🔄 Recommendation changed:', {
          from: lastRecommendationId,
          to: currentId,
          recommendation: nextRecommendation
        });
        setLastRecommendationId(currentId);
      }
    } else if (lastRecommendationId !== null) {
      // No recommendations left, clear the last ID
      console.log('🔄 No more recommendations');
      setLastRecommendationId(null);
    }
  }, [nextRecommendation?.accountId, nextRecommendation?.shift, nextRecommendation?.postNumber, state.postLogs.length]);

  const handlePostNow = (recommendation: RecommendedPost) => {
    setSelectedRecommendation(recommendation);
    setShowChecklist(true);
  };

  const handleChecklistSubmit = (checklistState: ChecklistState, notes: string) => {
    if (selectedRecommendation) {
      const account = state.accounts.find(a => a.id === selectedRecommendation.accountId);
      const creator = state.creators.find(c => c.id === account?.creatorId);
      
      if (account && creator) {
        console.log('📝 Logging post for:', {
          account: account.handle,
          platform: account.platform,
          shift: selectedRecommendation.shift,
          postNumber: selectedRecommendation.postNumber
        });
        
        // Close modal first
        setShowChecklist(false);
        setSelectedRecommendation(null);
        
        // Log the post without a slot ID (dynamic posting)
        logPost(undefined, checklistState, notes, account.id, account.platform);
        
        // Force complete state reset
        setTimeout(() => {
          setCurrentTime(new Date());
        }, 0);
        
        setTimeout(() => {
          setCurrentTime(new Date());
        }, 100);
        
        setTimeout(() => {
          setCurrentTime(new Date());
        }, 250);
        
        setTimeout(() => {
          setCurrentTime(new Date());
        }, 500);
        
        console.log('✅ Post logged, forced refresh triggered');
      }
    }
  };

  // Determine shift based on USER's current local time (not platform time)
  const getUserShift = (): 'morning' | 'evening' => {
    const now = new Date();
    const userHour = now.getHours(); // User's local hour
    return userHour < 14 ? 'morning' : 'evening'; // Before 2 PM = morning, after = evening
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await manualSync();
      setCurrentTime(new Date()); // Force refresh
    } catch (err: any) {
      alert(`❌ Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Get button config based on timing
  const getButtonConfig = (rec: RecommendedPost) => {
    // Priority 1: Check if during cooldown (most important warning)
    if (rec.isDuringCooldown && rec.cooldownEndsInMinutes) {
      return {
        text: `⚠️ COOLDOWN WARNING: Wait ${formatCountdown(rec.cooldownEndsInMinutes)} for optimal results`,
        className: 'bg-orange-600 hover:bg-orange-700',
        statusColor: 'bg-orange-500',
        isWarning: true,
        warningMessage: `You're in the cooldown period. For best results, wait ${formatCountdown(rec.cooldownEndsInMinutes)} before posting. However, you can still post now if needed.`
      };
    }
    
    // Priority 2: Perfect timing
    if (rec.isPerfectTime) {
      return {
        text: '🎯 Perfect Time! Post Now',
        className: 'bg-green-600 hover:bg-green-700',
        statusColor: 'bg-green-500',
        isWarning: false
      };
    } 
    
    // Priority 3: Too early
    if (rec.isTooEarly) {
      return {
        text: `⏰ Too Early by ${formatCountdown(rec.minutesUntilRecommended)} • Recommended: ${rec.recommendedTimeCreatorTZ}`,
        className: 'bg-amber-600 hover:bg-amber-700',
        statusColor: 'bg-amber-500',
        isWarning: false
      };
    } 
    
    // Priority 4: Too late
    return {
      text: `⏱️ ${formatCountdown(Math.abs(rec.minutesUntilRecommended))} Late • Was Recommended: ${rec.recommendedTimeCreatorTZ}`,
      className: 'bg-red-600 hover:bg-red-700',
      statusColor: 'bg-red-500',
      isWarning: false
    };
  };

  const getOrdinal = (n: number) => {
    if (n === 1) return 'First';
    if (n === 2) return 'Second';
    if (n === 3) return 'Third';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-4xl mx-auto py-8">
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

        {/* Main Next Post Card */}
        {nextRecommendation ? (
          <Card className="shadow-2xl border-4 border-white mb-6">
            {(() => {
              const account = state.accounts.find(a => a.id === nextRecommendation.accountId);
              const creator = state.creators.find(c => c.id === account?.creatorId);
              if (!account || !creator) return null;

              const platformAccounts = state.accounts.filter(a => a.platform === nextRecommendation.platform);
              const accountIndex = platformAccounts.findIndex(a => a.id === account.id) + 1;
              const platformName = PLATFORM_NAMES[nextRecommendation.platform];
              const postLabel = getOrdinal(nextRecommendation.postNumber);
              const buttonConfig = getButtonConfig(nextRecommendation);

              return (
                <div className="text-center">
                  <div className="inline-block px-6 py-2 bg-blue-100 text-blue-900 rounded-full text-sm font-semibold mb-4">
                    NEXT RECOMMENDED POST
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <PlatformIcon platform={nextRecommendation.platform} className="w-16 h-16" />
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

                  <div className="flex items-center justify-center gap-4 mb-6 text-sm flex-wrap">
                    <div className="px-4 py-2 bg-gray-100 rounded-lg">
                      <span className="text-gray-600">Username: </span>
                      <span className="font-semibold text-gray-900">{account.handle}</span>
                    </div>
                    <div className="px-4 py-2 bg-blue-100 rounded-lg">
                      <span className="text-blue-600">📱 </span>
                      <span className="font-semibold text-blue-900">{account.device}</span>
                    </div>
                    <div className="px-4 py-2 bg-purple-100 rounded-lg">
                      <span className="text-purple-600">
                        {nextRecommendation.shift === 'morning' ? '🌅' : '🌙'} 
                      </span>
                      <span className="font-semibold text-purple-900 ml-1">
                        {nextRecommendation.shift.charAt(0).toUpperCase() + nextRecommendation.shift.slice(1)} Shift
                      </span>
                    </div>
                  </div>

                  {/* Times Display */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                      <div className="text-xs text-purple-600 font-semibold mb-1">US Time</div>
                      <div className="text-3xl font-black text-purple-900">
                        {nextRecommendation.recommendedTimeCreatorTZ}
                      </div>
                      <div className="text-xs text-purple-600 mt-1">Central Time</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                      <div className="text-xs text-green-600 font-semibold mb-1">Your Time</div>
                      <div className="text-3xl font-black text-green-900">
                        {nextRecommendation.recommendedTimeUserTZ}
                      </div>
                      <div className="text-xs text-green-600 mt-1">{state.userSettings.userTimezone.split('/')[1]}</div>
                    </div>
                  </div>

                  {/* Timing Status */}
                  {nextRecommendation.isDuringCooldown && nextRecommendation.cooldownEndsInMinutes ? (
                    <div className="p-6 bg-orange-50 border-4 border-orange-300 rounded-2xl mb-6">
                      <div className="text-sm text-orange-600 font-semibold mb-2">
                        ⚠️ COOLDOWN PERIOD ACTIVE
                      </div>
                      <div className="text-3xl font-black text-orange-900">
                        Wait {formatCountdown(nextRecommendation.cooldownEndsInMinutes)} for Best Results
                      </div>
                      <div className="text-sm text-orange-700 mt-3 p-3 bg-orange-100 rounded-lg">
                        <strong>Recommendation:</strong> Posting during cooldown may reduce engagement. 
                        The algorithm works best with {COOLDOWN_MINUTES[nextRecommendation.platform]} minutes between posts.
                        However, you can still post now if needed - it's your choice!
                      </div>
                    </div>
                  ) : nextRecommendation.isPerfectTime ? (
                    <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl mb-6 animate-pulse">
                      <div className="text-2xl font-bold text-green-900">
                        🎯 Perfect Timing Window!
                      </div>
                      <div className="text-sm text-green-700 mt-2">
                        Post now for optimal engagement
                      </div>
                    </div>
                  ) : nextRecommendation.isTooEarly ? (
                    <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-2xl mb-6">
                      <div className="text-sm text-amber-600 font-semibold mb-2">
                        You're {formatCountdown(nextRecommendation.minutesUntilRecommended)} Early
                      </div>
                      <div className="text-3xl font-black text-amber-900">
                        ⏰ Not Recommended Yet
                      </div>
                      <div className="text-sm text-amber-700 mt-2">
                        Recommended for {nextRecommendation.recommendedTimeCreatorTZ}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl mb-6">
                      <div className="text-sm text-red-600 font-semibold mb-2">
                        You're {formatCountdown(Math.abs(nextRecommendation.minutesUntilRecommended))} Late
                      </div>
                      <div className="text-3xl font-black text-red-900">
                        ⏱️ Past Recommended Time
                      </div>
                      <div className="text-sm text-red-700 mt-2">
                        Was recommended for {nextRecommendation.recommendedTimeCreatorTZ}
                      </div>
                    </div>
                  )}

                  {/* Media Link & Caption Section */}
                  <div className="mb-6 space-y-4">
                    {/* Telegram Media Link */}
                    {account.telegramLink && (
                      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-blue-900">Media Link (Telegram)</span>
                          </div>
                          <a
                            href={account.telegramLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Media
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Caption Display for TikTok */}
                    {nextRecommendation.platform === 'tiktok' && (() => {
                      const nextCaption = account.captions?.find(c => !c.used);
                      if (nextCaption) {
                        return (
                          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                            <div className="font-semibold text-purple-900 mb-3 flex items-center justify-between">
                              <span>📝 Next Caption Ready</span>
                              <span className="text-xs bg-purple-200 px-2 py-1 rounded-full">
                                {account.captions?.filter(c => !c.used).length} unused
                              </span>
                            </div>
                            
                            {/* Slides - Each with Copy Button */}
                            <div className="mb-3">
                              <p className="text-xs text-purple-600 font-semibold mb-2">Slides ({nextCaption.slides.length}):</p>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {nextCaption.slides.map((slide, i) => (
                                  <div key={i} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-purple-200">
                                    <span className="text-xs font-bold text-purple-500 mt-1 flex-shrink-0">{i + 1}.</span>
                                    <p className="text-sm text-gray-800 flex-1">{slide}</p>
                                    <button
                                      onClick={() => copyToClipboard(slide, `today-slide-${i}`)}
                                      className="p-1 hover:bg-purple-100 rounded transition-colors flex-shrink-0"
                                    >
                                      {copiedText === `today-slide-${i}` ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <Copy className="w-4 h-4 text-purple-600" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Title + Hashtags */}
                            <div className="bg-white p-3 rounded-lg">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-xs text-purple-600 font-semibold mb-1">Title + Hashtags:</p>
                                  <p className="text-sm text-gray-900 font-medium">{nextCaption.title}</p>
                                  <p className="text-sm text-purple-700 mt-1">{nextCaption.hashtags}</p>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(`${nextCaption.title}\n\n${nextCaption.hashtags}`, 'caption-preview')}
                                  className="p-2 hover:bg-purple-100 rounded transition-colors flex-shrink-0"
                                >
                                  {copiedText === 'caption-preview' ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <Copy className="w-5 h-5 text-purple-600" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-purple-600 mt-2">
                              💡 Full caption details available in Content tab
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Post Button - Always Enabled */}
                  <Button
                    onClick={() => handlePostNow(nextRecommendation)}
                    size="lg"
                    className={`text-lg px-8 py-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all ${buttonConfig.className} mb-4`}
                  >
                    ✓ I Just Made {postLabel} Post of {getUserShift().charAt(0).toUpperCase() + getUserShift().slice(1)} Shift
                  </Button>

                  {/* Skip Button */}
                  <Button
                    onClick={() => {
                      skipPost(account.id, nextRecommendation.platform, () => {
                        // Force immediate refresh of recommendations AFTER state update
                        setCurrentTime(new Date());
                        
                        setTimeout(() => {
                          setCurrentTime(new Date());
                        }, 50);
                        
                        setTimeout(() => {
                          setCurrentTime(new Date());
                        }, 150);
                        
                        setTimeout(() => {
                          setCurrentTime(new Date());
                        }, 300);
                        
                        console.log('⏭️ Post skipped, UI refreshed');
                      });
                    }}
                    variant="ghost"
                    size="lg"
                    className="w-full text-base mb-4"
                  >
                    ⏭️ Skip This Post
                  </Button>

                  {/* Timing feedback */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      {buttonConfig.text}
                    </p>
                  </div>

                  {/* Next recommendations preview */}
                  {recommendations.length > 1 && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 mb-3">
                        <strong>Next in queue:</strong>
                      </p>
                      <div className="space-y-2">
                        {recommendations.slice(1, 4).map((rec) => {
                          const acc = state.accounts.find(a => a.id === rec.accountId);
                          const cre = state.creators.find(c => c.id === acc?.creatorId);
                          if (!acc || !cre) return null;
                          
                          const platAccs = state.accounts.filter(a => a.platform === rec.platform);
                          const accIdx = platAccs.findIndex(a => a.id === acc.id) + 1;
                          const minutes = getMinutesUntil(rec.recommendedTimeUTC);
                          
                          return (
                            <div key={rec.accountId + rec.shift} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <PlatformIcon platform={rec.platform} className="w-4 h-4" />
                                <span className="font-semibold">
                                  {PLATFORM_NAMES[rec.platform]} {accIdx} ({rec.shift})
                                </span>
                              </div>
                              <span className="text-gray-600">
                                in {formatCountdown(minutes)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>
        ) : (
          <Card className="shadow-2xl text-center p-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">All Done! 🎉</h2>
            <p className="text-gray-600 mb-4">
              You've completed all recommended posts for today.
            </p>
            <Button onClick={() => setCurrentScreen('scheduled-posts')}>
              View Today's Schedule
            </Button>
          </Card>
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
