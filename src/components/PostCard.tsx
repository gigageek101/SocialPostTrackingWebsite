import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { PlatformIcon } from './ui/PlatformIcon';
import { CheckCircle, ExternalLink, SkipForward, Clock, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { PLATFORM_NAMES, PLATFORM_COLORS, COOLDOWN_MINUTES } from '../constants/platforms';
import { RecommendedPost } from '../utils/dynamicScheduler';
import { formatCountdown } from '../utils/timezone';
import { PlatformAccount, Creator, PostLogEntry } from '../types';

interface PostCardProps {
  rec: RecommendedPost;
  account: PlatformAccount;
  creator: Creator;
  accountIndex: number;
  postLogs: PostLogEntry[];
  onPostNow: () => void;
  onPostEarlier: () => void;
  onSkip: () => void;
}

export function PostCard({
  rec,
  account,
  creator,
  accountIndex,
  postLogs,
  onPostNow,
  onPostEarlier,
  onSkip,
}: PostCardProps) {
  const isCompleted = rec.alreadyCompleted;
  const isSkipped = rec.skipped;
  const isPending = !isCompleted && !isSkipped;

  // Calculate live cooldown for pending posts
  const [liveCooldown, setLiveCooldown] = useState<number | null>(null);
  
  // Calculate time since post for completed posts
  const [timeSincePost, setTimeSincePost] = useState<string>('');
  
  useEffect(() => {
    if (!isPending) return;
    
    const updateCooldown = () => {
      // Find the most recent completed post for this account (not skipped)
      const today = format(new Date(), 'yyyy-MM-dd');
      const accountPostsToday = postLogs
        .filter(p => {
          const logDate = format(new Date(p.timestampUTC), 'yyyy-MM-dd');
          return logDate === today && p.accountId === rec.accountId && !p.skipped;
        })
        .sort((a, b) => b.timestampUTC.localeCompare(a.timestampUTC));
      
      if (accountPostsToday.length === 0) {
        setLiveCooldown(null);
        return;
      }
      
      const lastPost = accountPostsToday[0];
      const cooldownMinutes = COOLDOWN_MINUTES[rec.platform];
      
      if (cooldownMinutes === 0) {
        setLiveCooldown(null);
        return;
      }
      
      const lastPostTime = new Date(lastPost.timestampUTC).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - lastPostTime) / 1000 / 60;
      const remainingMinutes = cooldownMinutes - elapsedMinutes;
      
      if (remainingMinutes > 0) {
        setLiveCooldown(Math.ceil(remainingMinutes));
      } else {
        setLiveCooldown(null);
      }
    };
    
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    
    return () => clearInterval(interval);
  }, [isPending, rec.accountId, rec.platform, postLogs.length]);

  // Update "time since post" for completed posts
  useEffect(() => {
    if (!isCompleted) return;
    
    const updateTimeSince = () => {
      const postTime = new Date(rec.recommendedTimeUTC).getTime();
      const now = Date.now();
      const elapsedMinutes = Math.floor((now - postTime) / 1000 / 60);
      
      if (elapsedMinutes < 1) {
        setTimeSincePost('Just now');
      } else if (elapsedMinutes === 1) {
        setTimeSincePost('1 minute ago');
      } else if (elapsedMinutes < 60) {
        setTimeSincePost(`${elapsedMinutes} minutes ago`);
      } else {
        const hours = Math.floor(elapsedMinutes / 60);
        const mins = elapsedMinutes % 60;
        if (hours === 1) {
          setTimeSincePost(mins > 0 ? `1 hour ${mins} min ago` : '1 hour ago');
        } else {
          setTimeSincePost(mins > 0 ? `${hours} hours ${mins} min ago` : `${hours} hours ago`);
        }
      }
    };
    
    updateTimeSince();
    const interval = setInterval(updateTimeSince, 1000);
    
    return () => clearInterval(interval);
  }, [isCompleted, rec.recommendedTimeUTC]);

  return (
    <Card 
      className={`transition-all ${
        isCompleted 
          ? 'bg-green-50 border-2 border-green-200' 
          : isSkipped
          ? 'bg-yellow-50 border-2 border-yellow-200'
          : liveCooldown
          ? 'bg-orange-50 border-2 border-orange-300 animate-pulse'
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
            
            {/* Completed Post Timestamp */}
            {isCompleted && (
              <div className="mb-3 p-3 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">✅ Posted</p>
                    <p className="text-xl font-black text-red-600 tabular-nums">
                      {rec.recommendedTimeUserTZ}
                    </p>
                    <p className="text-sm text-green-700 font-semibold mt-1">
                      {timeSincePost}
                    </p>
                    {/* Post Link */}
                    {(() => {
                      const postLog = postLogs.find(
                        p => p.accountId === rec.accountId && 
                             p.postNumber === rec.postNumber && 
                             !p.skipped
                      );
                      if (postLog?.postLink) {
                        return (
                          <a
                            href={postLog.postLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Post
                          </a>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            )}
            
            {/* Live Cooldown Display */}
            {isPending && liveCooldown && liveCooldown > 0 && (
              <div className="mb-3 p-3 bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-400 rounded-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <Timer className="w-6 h-6 text-orange-600 animate-spin" style={{ animationDuration: '2s' }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-orange-800 uppercase tracking-wide">⏳ Cooldown Active</p>
                    <p className="text-2xl font-black text-orange-900 tabular-nums">
                      {Math.floor(liveCooldown)} {Math.floor(liveCooldown) === 1 ? 'minute' : 'minutes'}
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Wait for best results • Can post now if urgent
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-1 text-sm">
              {!isCompleted && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Scheduled Time:</span>
                  <span className="font-medium text-gray-900">{rec.recommendedTimeUserTZ}</span>
                </div>
              )}
              
              {/* Timing indicator (only show if NOT in cooldown) */}
              {isPending && !liveCooldown && (
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
                onClick={onPostNow}
                className={`whitespace-nowrap ${liveCooldown ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
              >
                {liveCooldown ? '⚠️ Post Anyway' : '✓ I Just Posted'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onPostEarlier}
                className="whitespace-nowrap text-xs"
              >
                🕐 Posted Earlier
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onSkip}
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
}

