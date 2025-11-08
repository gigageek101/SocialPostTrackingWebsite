import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { PlatformIcon } from '../ui/PlatformIcon';
import { PLATFORM_NAMES } from '../../constants/platforms';
import { format, parseISO } from 'date-fns';
import { Clock, CheckCircle, ChevronDown, ChevronUp, Copy, Check, ExternalLink, SkipForward, Calendar } from 'lucide-react';
import { PostLogEntry } from '../../types';

export function ScheduleHistoryScreen() {
  const { state } = useApp();
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  if (!state.userSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto py-8">
          <Card className="text-center p-8">
            <p className="text-gray-600">Loading...</p>
          </Card>
        </div>
      </div>
    );
  }

  // Group all posts by date
  const postsByDate = new Map<string, PostLogEntry[]>();
  
  state.postLogs.forEach(log => {
    const logDate = format(new Date(log.timestampUTC), 'yyyy-MM-dd');
    if (!postsByDate.has(logDate)) {
      postsByDate.set(logDate, []);
    }
    postsByDate.get(logDate)!.push(log);
  });

  // Sort dates descending (most recent first)
  const sortedDates = Array.from(postsByDate.keys()).sort((a, b) => b.localeCompare(a));

  // Calculate wait time between posts on the same account
  const calculateWaitTime = (posts: PostLogEntry[], currentPost: PostLogEntry, index: number): string => {
    if (index === 0) return 'First post';
    
    // Find previous post on the SAME account
    const previousPostOnSameAccount = posts.slice(0, index).reverse().find(p => p.accountId === currentPost.accountId);
    
    if (!previousPostOnSameAccount) return 'First post for this account';
    
    const prevTime = new Date(previousPostOnSameAccount.timestampUTC).getTime();
    const currentTime = new Date(currentPost.timestampUTC).getTime();
    const diffMinutes = Math.round((currentTime - prevTime) / 1000 / 60);
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes after previous`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m after previous` : `${hours}h after previous`;
    }
  };

  const renderPostsForShift = (posts: PostLogEntry[], shiftName: string) => {
    if (posts.length === 0) return null;

    return (
      <div className="mb-6">
        <div className={`border-b-4 pb-3 mb-4 ${shiftName === 'morning' ? 'border-amber-400' : 'border-purple-400'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {shiftName === 'morning' ? '🌅 Morning Shift' : '🌙 Evening Shift'}
            </h3>
            <div className="text-right">
              <div className={`text-2xl font-black ${shiftName === 'morning' ? 'text-amber-600' : 'text-purple-600'}`}>
                {posts.length}
              </div>
              <p className="text-xs text-gray-600">Posts</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {posts.map((post, index) => {
            const account = state.accounts.find(a => a.id === post.accountId);
            const creator = state.creators.find(c => c.id === account?.creatorId);
            if (!account || !creator) return null;

            const platformAccounts = state.accounts.filter(a => a.platform === post.platform);
            const accountIndex = platformAccounts.findIndex(a => a.id === post.accountId) + 1;
            
            const isExpanded = expandedPostId === post.id;
            const waitTime = calculateWaitTime(posts, post, index);

            return (
              <div key={post.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors">
                {/* Main Post Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {post.skipped ? (
                        <SkipForward className="w-6 h-6 text-yellow-600" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                      <PlatformIcon platform={post.platform} className="w-8 h-8" />
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">
                          {PLATFORM_NAMES[post.platform]} {accountIndex} - {creator.name}
                          {post.skipped && <span className="ml-2 text-yellow-600 text-sm">(Skipped)</span>}
                        </h4>
                        <p className="text-sm text-gray-600">@{account.handle} • 📱 {account.device}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>

                  {/* Time Info */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs text-purple-600 font-semibold mb-1">US Time</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span className="font-mono font-bold text-purple-900">{post.timestampCreatorTZ}</span>
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-green-600 font-semibold mb-1">Your Time</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="font-mono font-bold text-green-900">{post.timestampUserTZ}</span>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-600 font-semibold mb-1">Wait Time</p>
                      <p className="font-semibold text-blue-900 text-sm">{waitTime}</p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-200 space-y-4 animate-fade-in">
                      {/* Telegram Link */}
                      {account.telegramLink && (
                        <div>
                          <h5 className="font-bold text-gray-900 mb-2">📱 Telegram</h5>
                          <a
                            href={account.telegramLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Post Links
                          </a>
                        </div>
                      )}

                      {/* Caption (TikTok only) */}
                      {post.platform === 'tiktok' && post.captionId && account.captions && (
                        (() => {
                          const caption = account.captions.find(c => c.id === post.captionId);
                          if (!caption) return null;

                          return (
                            <div>
                              <h5 className="font-bold text-gray-900 mb-2">📝 Caption Used</h5>
                              <div className="space-y-3">
                                {/* Slides */}
                                <div>
                                  <p className="text-sm font-semibold text-gray-700 mb-2">Slides:</p>
                                  <div className="space-y-2">
                                    {caption.slides.map((slide, i) => (
                                      <div key={i} className="flex items-start gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                        <span className="text-xs font-bold text-gray-500 mt-1">{i + 1}.</span>
                                        <p className="text-sm text-gray-800 flex-1">{slide}</p>
                                        <button
                                          onClick={() => copyToClipboard(slide, `${post.id}-slide-${i}`)}
                                          className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                        >
                                          {copiedId === `${post.id}-slide-${i}` ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                          ) : (
                                            <Copy className="w-4 h-4 text-gray-600" />
                                          )}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Title + Hashtags Combined */}
                                <div>
                                  <p className="text-sm font-semibold text-gray-700 mb-2">Title + Hashtags:</p>
                                  <div className="bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 space-y-2">
                                        <p className="text-sm text-gray-900 font-medium">{caption.title}</p>
                                        <p className="text-sm text-blue-700">{caption.hashtags}</p>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(`${caption.title}\n\n${caption.hashtags}`, `${post.id}-title`)}
                                        className="p-2 hover:bg-blue-200 rounded transition-colors flex-shrink-0"
                                      >
                                        {copiedId === `${post.id}-title` ? (
                                          <Check className="w-5 h-5 text-green-600" />
                                        ) : (
                                          <Copy className="w-5 h-5 text-blue-600" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Checklist */}
                      <div>
                        <h5 className="font-bold text-gray-900 mb-2">✓ Completed Actions</h5>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          {post.checklistState.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              {item.completed ? (
                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 border-2 border-gray-300 rounded flex-shrink-0" />
                              )}
                              <span className={`text-sm ${item.completed ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                                {item.label}
                                {item.type === 'counter' && item.count !== undefined && ` (${item.count})`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      {post.notes && (
                        <div>
                          <h5 className="font-bold text-gray-900 mb-2">📝 Notes</h5>
                          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDateSection = (date: string, posts: PostLogEntry[]) => {
    const isExpanded = expandedDates.has(date);
    const today = format(new Date(), 'yyyy-MM-dd');
    const isToday = date === today;

    // Sort posts by time
    const sortedPosts = [...posts].sort((a, b) => a.timestampUTC.localeCompare(b.timestampUTC));

    // Separate by shift
    const morningPosts: PostLogEntry[] = [];
    const eveningPosts: PostLogEntry[] = [];

    sortedPosts.forEach(post => {
      const userTimeStr = post.timestampUserTZ;
      const isPM = userTimeStr.includes('PM');
      const timeMatch = userTimeStr.match(/(\d+):(\d+)/);
      
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
        
        if (hour < 14) {
          morningPosts.push(post);
        } else {
          eveningPosts.push(post);
        }
      } else {
        morningPosts.push(post);
      }
    });

    const totalPosts = posts.length;
    const completedPosts = posts.filter(p => !p.skipped).length;
    const skippedPosts = posts.filter(p => p.skipped).length;

    return (
      <Card key={date} className="shadow-lg mb-6">
        <button
          onClick={() => toggleDate(date)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div className="text-left">
              <h2 className="text-2xl font-bold text-gray-900">
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                {isToday && <span className="ml-3 text-blue-600">📍 TODAY</span>}
              </h2>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-gray-600">{totalPosts} total posts</span>
                {completedPosts > 0 && (
                  <span className="text-sm text-green-600 font-semibold">{completedPosts} completed</span>
                )}
                {skippedPosts > 0 && (
                  <span className="text-sm text-yellow-600 font-semibold">{skippedPosts} skipped</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-6 h-6 text-gray-600" />
            ) : (
              <ChevronDown className="w-6 h-6 text-gray-600" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="px-6 pb-6 pt-2 border-t-2 border-gray-200 animate-fade-in">
            {renderPostsForShift(morningPosts, 'morning')}
            {renderPostsForShift(eveningPosts, 'evening')}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-2">📅 Schedule History</h1>
          <p className="text-gray-600">
            All your posts organized by date • Click any date to expand
          </p>
        </div>

        {sortedDates.length === 0 && (
          <Card className="text-center p-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Posts Yet</h3>
            <p className="text-gray-600">
              Start posting to build your history!
            </p>
          </Card>
        )}

        {sortedDates.map(date => {
          const postsForDate = postsByDate.get(date) || [];
          return renderDateSection(date, postsForDate);
        })}
      </div>
    </div>
  );
}

