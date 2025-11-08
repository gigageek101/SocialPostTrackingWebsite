import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TrendingUp, Calendar, Award, Flame, Target, Zap, Trophy, Star } from 'lucide-react';
import { ModernBarChart } from '../ModernBarChart';
import { useApp } from '../../context/AppContext';
import { format, subDays, isSameDay, differenceInDays } from 'date-fns';
import { PLATFORM_NAMES } from '../../constants/platforms';

interface DayStats {
  date: Date;
  dateString: string;
  totalPosts: number;
  postsByPlatform: Record<string, number>;
  hasPosted: boolean;
}

interface Milestone {
  streak: number;
  title: string;
  emoji: string;
  color: string;
  message: string;
}

const MILESTONES: Milestone[] = [
  { streak: 3, title: 'Getting Started', emoji: '🌱', color: 'text-green-600', message: '3 days in a row! You\'re building momentum!' },
  { streak: 7, title: 'One Week Warrior', emoji: '🔥', color: 'text-orange-600', message: 'A full week! You\'re on fire!' },
  { streak: 14, title: 'Two Week Champion', emoji: '⚡', color: 'text-yellow-600', message: '14 days straight! Unstoppable!' },
  { streak: 30, title: 'Monthly Master', emoji: '🏆', color: 'text-purple-600', message: '30 days! You\'re a posting machine!' },
  { streak: 60, title: 'Two Month Legend', emoji: '👑', color: 'text-blue-600', message: '60 days! You\'re legendary!' },
  { streak: 90, title: 'Quarter Year King', emoji: '💎', color: 'text-cyan-600', message: '90 days! Diamond level consistency!' },
  { streak: 180, title: 'Half Year Hero', emoji: '🌟', color: 'text-pink-600', message: '180 days! You\'re a true hero!' },
  { streak: 365, title: 'Full Year God', emoji: '🌠', color: 'text-indigo-600', message: '365 DAYS! You are a POSTING GOD!' },
];

export function StatisticsScreen() {
  const { state, setCurrentScreen } = useApp();
  const [showMilestone, setShowMilestone] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Force re-calculate when data changes
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [state.postLogs.length]);

  // Calculate daily stats for the last 30 days
  const calculateDailyStats = (): DayStats[] => {
    const days: DayStats[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      // Set to start of day in local timezone
      date.setHours(0, 0, 0, 0);
      const dateString = format(date, 'yyyy-MM-dd');
      
      const dayPosts = state.postLogs.filter(log => {
        if (log.skipped) return false;
        
        // Use local date comparison (user's timezone)
        const logDate = new Date(log.timestampUTC);
        const logDateString = format(logDate, 'yyyy-MM-dd');
        
        return logDateString === dateString;
      });
      
      const postsByPlatform: Record<string, number> = {};
      dayPosts.forEach(post => {
        const platform = post.checklistState.platform;
        postsByPlatform[platform] = (postsByPlatform[platform] || 0) + 1;
      });
      
      days.push({
        date,
        dateString,
        totalPosts: dayPosts.length,
        postsByPlatform,
        hasPosted: dayPosts.length > 0,
      });
    }
    
    return days;
  };

  // Calculate current streak
  const calculateStreak = (): { current: number; longest: number; lastPostDate: Date | null } => {
    if (state.postLogs.length === 0) {
      return { current: 0, longest: 0, lastPostDate: null };
    }

    // Get all unique days with posts (not skipped)
    const daysWithPosts = new Set<string>();
    state.postLogs.forEach(log => {
      if (!log.skipped) {
        const logDate = format(new Date(log.timestampUTC), 'yyyy-MM-dd');
        daysWithPosts.add(logDate);
      }
    });

    const sortedDays = Array.from(daysWithPosts)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    if (sortedDays.length === 0) {
      return { current: 0, longest: 0, lastPostDate: null };
    }

    const today = new Date();
    const yesterday = subDays(today, 1);
    const lastPostDate = sortedDays[0];

    // Calculate current streak
    let currentStreak = 0;
    
    // Check if posted today or yesterday
    if (isSameDay(lastPostDate, today) || isSameDay(lastPostDate, yesterday)) {
      currentStreak = 1;
      let checkDate = lastPostDate;
      
      for (let i = 1; i < sortedDays.length; i++) {
        const prevDay = sortedDays[i];
        const daysDiff = differenceInDays(checkDate, prevDay);
        
        if (daysDiff === 1) {
          currentStreak++;
          checkDate = prevDay;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak ever
    let longestStreak = 0;
    let tempStreak = 1;
    
    for (let i = 1; i < sortedDays.length; i++) {
      const daysDiff = differenceInDays(sortedDays[i - 1], sortedDays[i]);
      
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak, lastPostDate };
  };

  const dailyStats = calculateDailyStats();
  const { current: currentStreak, longest: longestStreak, lastPostDate } = calculateStreak();
  
  // Check for milestone achievement
  useEffect(() => {
    if (currentStreak > 0) {
      const milestone = MILESTONES.find(m => m.streak === currentStreak);
      if (milestone) {
        setCurrentMilestone(milestone);
        setShowMilestone(true);
        
        // Auto-hide after 5 seconds
        setTimeout(() => setShowMilestone(false), 5000);
      }
    }
  }, [currentStreak]);

  const totalPosts = state.postLogs.filter(p => !p.skipped).length;
  const averagePerDay = dailyStats.length > 0 
    ? (dailyStats.reduce((sum, day) => sum + day.totalPosts, 0) / dailyStats.length).toFixed(1)
    : 0;

  const nextMilestone = MILESTONES.find(m => m.streak > currentStreak);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-black text-gray-900 mb-2">📊 Statistics & Streaks</h1>
          <p className="text-gray-600">Track your posting consistency and achievements</p>
        </div>

        {/* Milestone Achievement Banner */}
        {showMilestone && currentMilestone && (
          <Card className={`mb-6 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white animate-bounce border-4 border-yellow-300 shadow-2xl`}>
            <div className="text-center py-8">
              <div className="text-8xl mb-4 animate-pulse">{currentMilestone.emoji}</div>
              <h2 className="text-4xl font-black mb-2">🎉 MILESTONE ACHIEVED! 🎉</h2>
              <h3 className="text-3xl font-bold mb-4">{currentMilestone.title}</h3>
              <p className="text-xl font-semibold">{currentMilestone.message}</p>
            </div>
          </Card>
        )}

        {/* Current Streak Card */}
        <Card className={`mb-6 ${currentStreak >= 7 ? 'bg-gradient-to-r from-orange-100 to-red-100 border-4 border-orange-400' : 'bg-white'}`}>
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              {currentStreak >= 3 && (
                <Flame 
                  className={`w-16 h-16 ${currentStreak >= 7 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}
                  style={{ 
                    animation: currentStreak >= 7 ? 'pulse 1s infinite, bounce 2s infinite' : 'pulse 1s infinite'
                  }}
                />
              )}
              <div>
                <h2 className="text-6xl font-black text-gray-900 mb-2">
                  {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
                </h2>
                <p className="text-xl font-semibold text-gray-600">Current Streak</p>
              </div>
              {currentStreak >= 3 && (
                <Flame 
                  className={`w-16 h-16 ${currentStreak >= 7 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}
                  style={{ 
                    animation: currentStreak >= 7 ? 'pulse 1s infinite, bounce 2s infinite' : 'pulse 1s infinite'
                  }}
                />
              )}
            </div>
            
            {currentStreak === 0 && (
              <div className="mb-4">
                <p className="text-gray-600 text-lg mb-2">
                  {lastPostDate ? `Last post: ${format(lastPostDate, 'MMM d, yyyy')}` : 'No posts yet'}
                </p>
                <p className="text-orange-600 font-semibold">
                  🔥 Post today to start a new streak!
                </p>
              </div>
            )}

            {currentStreak > 0 && (
              <div className="space-y-3">
                {/* Streak Messages */}
                {currentStreak >= 30 && (
                  <div className="bg-purple-600 text-white px-6 py-3 rounded-full inline-block font-bold text-lg animate-pulse">
                    🏆 LEGENDARY STATUS! Keep it up! 👑
                  </div>
                )}
                {currentStreak >= 14 && currentStreak < 30 && (
                  <div className="bg-yellow-600 text-white px-6 py-3 rounded-full inline-block font-bold text-lg animate-pulse">
                    ⚡ You're CRUSHING IT! ⚡
                  </div>
                )}
                {currentStreak >= 7 && currentStreak < 14 && (
                  <div className="bg-orange-600 text-white px-6 py-3 rounded-full inline-block font-bold text-lg animate-pulse">
                    🔥 You're ON FIRE! 🔥
                  </div>
                )}
                {currentStreak >= 3 && currentStreak < 7 && (
                  <div className="bg-green-600 text-white px-6 py-3 rounded-full inline-block font-bold">
                    🌱 Great momentum!
                  </div>
                )}
                
                {/* Next Milestone */}
                {nextMilestone && (
                  <div className="mt-4">
                    <p className="text-gray-600 mb-2">Next Milestone:</p>
                    <div className="flex items-center justify-center gap-3 bg-gray-100 px-6 py-3 rounded-lg inline-block">
                      <Target className="w-6 h-6 text-blue-600" />
                      <span className="font-bold text-gray-900">
                        {nextMilestone.emoji} {nextMilestone.title}
                      </span>
                      <span className="text-gray-600">
                        ({nextMilestone.streak - currentStreak} {nextMilestone.streak - currentStreak === 1 ? 'day' : 'days'} to go)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Posts */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <div className="text-center">
              <Zap className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-4xl font-black text-gray-900 mb-1">{totalPosts}</h3>
              <p className="text-gray-600 font-semibold">Total Posts</p>
            </div>
          </Card>

          {/* Longest Streak */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h3 className="text-4xl font-black text-gray-900 mb-1">{longestStreak}</h3>
              <p className="text-gray-600 font-semibold">Longest Streak</p>
            </div>
          </Card>

          {/* Average Per Day */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-4xl font-black text-gray-900 mb-1">{averagePerDay}</h3>
              <p className="text-gray-600 font-semibold">Avg. Posts/Day (30d)</p>
            </div>
          </Card>
        </div>

        {/* Milestones Progress */}
        <Card className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-7 h-7 text-yellow-600" />
            Milestone Journey
          </h2>
          <div className="space-y-3">
            {MILESTONES.map((milestone) => {
              const achieved = currentStreak >= milestone.streak;
              const isNext = nextMilestone?.streak === milestone.streak;
              
              return (
                <div
                  key={milestone.streak}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                    achieved 
                      ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400' 
                      : isNext
                      ? 'bg-blue-50 border-2 border-blue-300'
                      : 'bg-gray-50 opacity-50'
                  }`}
                >
                  <div className={`text-4xl ${achieved ? 'animate-bounce' : ''}`}>
                    {achieved ? '✅' : milestone.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold text-lg ${milestone.color}`}>
                        {milestone.title}
                      </h3>
                      <span className="text-sm text-gray-600">({milestone.streak} days)</span>
                    </div>
                    <p className="text-sm text-gray-700">{milestone.message}</p>
                  </div>
                  {achieved && (
                    <Star className="w-8 h-8 text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Daily Posts Bar Chart */}
        <div className="mb-6" key={`chart-${refreshKey}`}>
          <ModernBarChart dailyStats={dailyStats} />
        </div>

        {/* Last 30 Days Calendar View */}
        <Card className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-blue-600" />
            Last 30 Days Activity Calendar
          </h2>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {dailyStats.map((day) => (
              <div
                key={day.dateString}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center transition-all hover:scale-110 ${
                  day.totalPosts === 0
                    ? 'bg-gray-100 border-2 border-gray-200'
                    : day.totalPosts >= 10
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border-2 border-purple-600'
                    : day.totalPosts >= 7
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white border-2 border-green-600'
                    : day.totalPosts >= 4
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-2 border-blue-600'
                    : 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white border-2 border-yellow-500'
                }`}
                title={`${format(day.date, 'MMM d, yyyy')}\n${day.totalPosts} posts`}
              >
                <div className="text-xs font-bold">
                  {format(day.date, 'd')}
                </div>
                {day.totalPosts > 0 && (
                  <div className="text-xs font-black">{day.totalPosts}</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded"></div>
              <span>No posts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-400 border-2 border-yellow-500 rounded"></div>
              <span>1-3</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-blue-600 rounded"></div>
              <span>4-6</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-500 border-2 border-green-600 rounded"></div>
              <span>7-9</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-purple-600 rounded"></div>
              <span>10+</span>
            </div>
          </div>
        </Card>

        {/* Daily Breakdown */}
        <Card>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Daily Post Breakdown</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {dailyStats
              .filter(day => day.totalPosts > 0)
              .reverse()
              .map((day) => (
                <div
                  key={day.dateString}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {format(day.date, 'EEEE, MMM d, yyyy')}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 flex gap-3">
                      {Object.entries(day.postsByPlatform).map(([platform, count]) => (
                        <span key={platform}>
                          {PLATFORM_NAMES[platform as keyof typeof PLATFORM_NAMES]}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-2xl font-black text-blue-600">
                    {day.totalPosts}
                  </div>
                </div>
              ))}
            {dailyStats.every(day => day.totalPosts === 0) && (
              <div className="text-center py-8 text-gray-500">
                No posts in the last 30 days. Start posting to track your stats!
              </div>
            )}
          </div>
        </Card>

        {/* Back Button */}
        <div className="mt-6">
          <Button
            onClick={() => setCurrentScreen('schedule-overview')}
            variant="secondary"
            size="lg"
            fullWidth
          >
            ← Back to Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}

