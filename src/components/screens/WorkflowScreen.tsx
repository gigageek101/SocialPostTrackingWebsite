import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Clock, Video, MessageSquare, Instagram as InstagramIcon, TrendingUp, Coffee, Moon } from 'lucide-react';

export function WorkflowScreen() {
  const { state } = useApp();

  // Count accounts per platform
  const tiktokCount = state.accounts.filter(a => a.platform === 'tiktok').length;
  const threadsCount = state.accounts.filter(a => a.platform === 'threads').length;
  const instagramCount = state.accounts.filter(a => a.platform === 'instagram').length;
  const facebookCount = state.accounts.filter(a => a.platform === 'facebook').length;

  // Calculate totals
  const totalTikToks = tiktokCount * 4; // 4 per account per day
  const totalThreads = threadsCount * 6; // 6 per account per day
  const totalInstagram = instagramCount * 2; // 2 per account per day
  const totalFacebook = facebookCount * 0; // Facebook removed

  // Get user's timezone display
  const userTimezone = state.userSettings?.userTimezone || 'Unknown';
  const location = userTimezone.split('/')[1]?.replace(/_/g, ' ') || userTimezone;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Personalized Header */}
        <Card className="shadow-xl mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="text-center">
            <h1 className="text-4xl font-black mb-3">
              👋 Welcome!
            </h1>
            <p className="text-lg text-indigo-100">
              Your Recommended Social Media Workflow
            </p>
            <p className="text-sm text-indigo-200 mt-2">
              Timezone: {location}
            </p>
          </div>
        </Card>

        {/* Recommended Schedule Overview */}
        <Card className="shadow-lg mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-600" />
            📅 Recommended Daily Schedule
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 rounded-xl border-2 border-indigo-200">
              <h3 className="font-bold text-indigo-900 mb-2">⏰ Wake-Up Time: 4:30 AM BKT</h3>
              <p className="text-sm text-indigo-800">
                I recommend waking up at 4:30 AM BKT (Bangkok Time) to be fresh and ready for your first posts at 5:45 AM. 
                This gives you time to prepare, grab coffee ☕, and start your day with focus.
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                <Coffee className="w-5 h-5" />
                🌅 Morning Shift Schedule (BKT)
              </h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• <strong>5:45 AM:</strong> TikTok Post #1 (3:45 PM CT)</li>
                <li>• <strong>7:30 AM:</strong> Threads Post #1 (5:30 PM CT)</li>
                <li>• <strong>8:00 AM:</strong> Instagram morning post (varies by creator timezone)</li>
                <li>• <strong>10:00 AM:</strong> TikTok Post #2 + Threads Post #2 (8:00 PM CT - PEAK TIME)</li>
                <li>• <strong>1:00 PM:</strong> Threads Post #3 (11:00 PM CT)</li>
                <li>• <strong>Complete all interactions</strong> after each post</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
              <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                <Moon className="w-5 h-5" />
                🌙 Evening Shift Schedule (BKT)
              </h3>
              <ul className="space-y-2 text-sm text-purple-800">
                <li>• <strong>4:00 PM:</strong> Threads Post #4 (2:00 AM CT - Low engagement slot)</li>
                <li>• <strong>7:00 PM:</strong> TikTok Post #3 + Threads Post #5 (5:00 AM CT - Early morning US)</li>
                <li>• <strong>7:30 PM:</strong> TikTok Post #4 (5:30 AM CT - Optional)</li>
                <li>• <strong>8:00 PM:</strong> Instagram evening post (varies by creator timezone)</li>
                <li>• <strong>8:30 PM:</strong> Threads Post #6 (6:30 AM CT - Approaching peak)</li>
                <li>• <strong>Maintain 2-hour cooldowns</strong> for TikTok and Threads</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* After Morning Shift Tasks */}
        <Card className="shadow-lg mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-blue-600" />
            📊 After Morning Shift Tasks
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <h3 className="font-bold text-blue-900 mb-2">1. Traffic Diary (Last 24 Hours)</h3>
              <p className="text-sm text-blue-800 mb-2">
                Review and document:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• Views, engagement, and performance per post</li>
                <li>• Best performing content types</li>
                <li>• Peak engagement times</li>
                <li>• Follower growth across platforms</li>
              </ul>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
              <h3 className="font-bold text-orange-900 mb-2">2. Content Preparation</h3>
              <p className="text-sm text-orange-800 mb-3">
                Prepare content for:
              </p>
              <div className="bg-orange-100 p-3 rounded-lg mb-3 border-l-4 border-orange-400">
                <p className="text-sm font-semibold text-orange-900">
                  📅 <strong>Today's Evening Shift</strong> + <strong>Tomorrow's Morning Shift</strong>
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  This ensures you always have content ready for the next posting sessions
                </p>
              </div>
              
              <div className="space-y-3">
                {tiktokCount > 0 && (
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Video className="w-5 h-5 text-gray-700" />
                      <span className="font-semibold text-gray-900">TikTok Content</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      <strong>{tiktokCount}</strong> account{tiktokCount > 1 ? 's' : ''} × 4 posts/day = 
                      <strong className="text-orange-600 ml-1">{totalTikToks} TikTok videos total</strong>
                    </p>
                  </div>
                )}

                {threadsCount > 0 && (
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-5 h-5 text-gray-700" />
                      <span className="font-semibold text-gray-900">Threads Content</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      <strong>{threadsCount}</strong> account{threadsCount > 1 ? 's' : ''} × 6 posts/day = 
                      <strong className="text-orange-600 ml-1">{totalThreads} Threads posts total</strong>
                    </p>
                  </div>
                )}

                {instagramCount > 0 && (
                  <div className="bg-white p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <InstagramIcon className="w-5 h-5 text-gray-700" />
                      <span className="font-semibold text-gray-900">Instagram Content</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      <strong>{instagramCount}</strong> account{instagramCount > 1 ? 's' : ''} × 2 posts/day = 
                      <strong className="text-orange-600 ml-1">{totalInstagram} Instagram posts total</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                <p className="text-sm text-orange-900 font-semibold">
                  📝 Total Content Needed Daily: {totalTikToks + totalThreads + totalInstagram + totalFacebook} posts
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Important Guidelines */}
        <Card className="shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">⚡ Important Guidelines</h2>
          
          <div className="space-y-3 text-sm text-gray-800">
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p><strong>2-Hour Cooldowns:</strong> TikTok and Threads require 2-hour waits between posts for best results</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p><strong>Complete Interactions:</strong> After each post, complete the full interaction checklist</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p><strong>Telegram Links:</strong> Always have media ready in Telegram before posting</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p><strong>TikTok Captions:</strong> Pre-write captions in the Content tab for smoother workflow</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <p><strong>Traffic Diary:</strong> Daily analysis helps you understand what works best</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

