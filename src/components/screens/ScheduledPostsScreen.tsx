import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { PlatformIcon } from '../ui/PlatformIcon';
import { PLATFORM_NAMES, PLATFORM_BASE_TIMES } from '../../constants/platforms';
import { format } from 'date-fns';
import { Clock, CheckCircle, ChevronDown, ChevronUp, Info, Copy, Check, ExternalLink } from 'lucide-react';
import { PostLogEntry } from '../../types';

export function ScheduledPostsScreen() {
  const { state } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

  // Get today's actual posts
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayPosts = state.postLogs.filter(log => {
    const logDate = format(new Date(log.timestampUTC), 'yyyy-MM-dd');
    return logDate === today;
  }).sort((a, b) => a.timestampUTC.localeCompare(b.timestampUTC));

  // Separate by shift (morning/evening)
  const morningPosts: PostLogEntry[] = [];
  const eveningPosts: PostLogEntry[] = [];

  todayPosts.forEach(post => {
    // Use the USER'S local time to determine shift (not US time)
    const userTimeStr = post.timestampUserTZ; // e.g., "Nov 6, 3:00 AM" or "Nov 6, 3:00 PM"
    const isPM = userTimeStr.includes('PM');
    const timeMatch = userTimeStr.match(/(\d+):(\d+)/);
    
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      
      // Morning shift: before 2:00 PM (14:00) USER TIME, Evening: 2:00 PM and after USER TIME
      if (hour < 14) {
        morningPosts.push(post);
      } else {
        eveningPosts.push(post);
      }
    } else {
      // Fallback if parsing fails
      morningPosts.push(post);
    }
  });

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

  const renderPostsTable = (posts: PostLogEntry[], shiftName: string) => {
    if (posts.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No posts made during {shiftName.toLowerCase()} yet
        </div>
      );
    }

    return (
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
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <PlatformIcon platform={post.platform} className="w-8 h-8" />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {PLATFORM_NAMES[post.platform]} {accountIndex} - {creator.name}
                      </h3>
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
                        <h4 className="font-bold text-gray-900 mb-2">📱 Telegram</h4>
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
                            <h4 className="font-bold text-gray-900 mb-2">📝 Caption Used</h4>
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
                      <h4 className="font-bold text-gray-900 mb-2">✓ Completed Actions</h4>
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
                        <h4 className="font-bold text-gray-900 mb-2">📝 Notes</h4>
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
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Today's Posts</h1>
          <p className="text-gray-600">
            {format(currentTime, 'EEEE, MMMM d, yyyy')} • {format(currentTime, 'HH:mm:ss')}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Only showing posts you've actually made today • Click to expand for details
          </p>
        </div>

        {/* Recommended Schedule Info */}
        <Card className="shadow-lg mb-6 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-blue-900 mb-3">📋 Recommended Posting Schedule</h3>
              <p className="text-sm text-blue-800 mb-4">
                These are the base recommended times. The app auto-adjusts after each post (adds cooldown).
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TikTok */}
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PlatformIcon platform="tiktok" className="w-5 h-5" />
                    <h4 className="font-bold text-gray-900">TikTok (6 posts/day)</h4>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Morning:</strong> {PLATFORM_BASE_TIMES.tiktok.slice(0, 3).join(', ')} (Bangkok)</p>
                    <p><strong>Evening:</strong> {PLATFORM_BASE_TIMES.tiktok.slice(3).join(', ')} (Bangkok)</p>
                    <p className="text-xs text-orange-600">⏱️ 2-hour cooldown between posts</p>
                  </div>
                </div>

                {/* Threads */}
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PlatformIcon platform="threads" className="w-5 h-5" />
                    <h4 className="font-bold text-gray-900">Threads (6 posts/day)</h4>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Morning:</strong> {PLATFORM_BASE_TIMES.threads.slice(0, 3).join(', ')} (Bangkok)</p>
                    <p><strong>Evening:</strong> {PLATFORM_BASE_TIMES.threads.slice(3).join(', ')} (Bangkok)</p>
                    <p className="text-xs text-orange-600">⏱️ 2-hour cooldown between posts</p>
                  </div>
                </div>

                {/* Instagram */}
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PlatformIcon platform="instagram" className="w-5 h-5" />
                    <h4 className="font-bold text-gray-900">Instagram (2 posts/day)</h4>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Morning:</strong> {PLATFORM_BASE_TIMES.instagram.morning} (US Central)</p>
                    <p><strong>Evening:</strong> {PLATFORM_BASE_TIMES.instagram.evening} (US Central)</p>
                    <p className="text-xs text-gray-500">No cooldown</p>
                  </div>
                </div>

                {/* Facebook */}
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PlatformIcon platform="facebook" className="w-5 h-5" />
                    <h4 className="font-bold text-gray-900">Facebook (2 posts/day)</h4>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Morning:</strong> {PLATFORM_BASE_TIMES.facebook.morning} (US Central)</p>
                    <p><strong>Evening:</strong> {PLATFORM_BASE_TIMES.facebook.evening} (US Central)</p>
                    <p className="text-xs text-gray-500">No cooldown</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {todayPosts.length === 0 && (
          <Card className="text-center p-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Posts Yet Today</h3>
            <p className="text-gray-600">
              Start posting to see your activity here!
            </p>
          </Card>
        )}

        {/* Morning Shift */}
        {morningPosts.length > 0 && (
          <Card className="shadow-lg mb-6">
            <div className="border-b-4 border-amber-400 pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    🌅 Morning Shift
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Before 2:00 PM (US Time)</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-amber-600">
                    {morningPosts.length}
                  </div>
                  <p className="text-xs text-gray-600">Posts Made</p>
                </div>
              </div>
            </div>
            {renderPostsTable(morningPosts, 'morning shift')}
          </Card>
        )}

        {/* Evening Shift */}
        {eveningPosts.length > 0 && (
          <Card className="shadow-lg">
            <div className="border-b-4 border-purple-400 pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    🌙 Evening Shift
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">After 2:00 PM (US Time)</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-purple-600">
                    {eveningPosts.length}
                  </div>
                  <p className="text-xs text-gray-600">Posts Made</p>
                </div>
              </div>
            </div>
            {renderPostsTable(eveningPosts, 'evening shift')}
          </Card>
        )}
      </div>
    </div>
  );
}
