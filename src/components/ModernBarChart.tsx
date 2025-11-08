import { useState } from 'react';
import { format } from 'date-fns';
import { PLATFORM_NAMES } from '../constants/platforms';

interface DayStats {
  date: Date;
  dateString: string;
  totalPosts: number;
  postsByPlatform: Record<string, number>;
  hasPosted: boolean;
}

interface ModernBarChartProps {
  dailyStats: DayStats[];
}

export function ModernBarChart({ dailyStats }: ModernBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxPosts = Math.max(...dailyStats.map(d => d.totalPosts), 1);
  const yAxisMax = Math.ceil(maxPosts * 1.2); // Add 20% headroom

  // Debug logging
  console.log('📊 ModernBarChart received:', {
    totalDays: dailyStats.length,
    daysWithPosts: dailyStats.filter(d => d.totalPosts > 0).length,
    maxPosts,
    yAxisMax,
    sampleDays: dailyStats.filter(d => d.totalPosts > 0).slice(0, 3),
  });

  const getBarColor = (count: number) => {
    if (count === 0) return 'from-gray-200 to-gray-300';
    if (count >= 10) return 'from-purple-500 via-pink-500 to-rose-500';
    if (count >= 7) return 'from-emerald-400 via-green-500 to-teal-500';
    if (count >= 4) return 'from-blue-400 via-cyan-500 to-sky-500';
    return 'from-amber-400 via-orange-500 to-red-500';
  };

  const getGlowColor = (count: number) => {
    if (count === 0) return '';
    if (count >= 10) return 'drop-shadow-[0_0_15px_rgba(236,72,153,0.7)]';
    if (count >= 7) return 'drop-shadow-[0_0_15px_rgba(34,197,94,0.7)]';
    if (count >= 4) return 'drop-shadow-[0_0_15px_rgba(59,130,246,0.7)]';
    return 'drop-shadow-[0_0_15px_rgba(251,146,60,0.7)]';
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl">
      {/* Title */}
      <div className="mb-6">
        <h3 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
          📊 Daily Performance
        </h3>
        <p className="text-slate-400 text-sm">Last 30 days posting activity</p>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {/* Y-axis */}
        <div className="flex gap-4">
          <div className="flex flex-col justify-between h-80 text-xs text-slate-500 pr-2 border-r border-slate-700">
            {[...Array(6)].map((_, i) => {
              const value = Math.round(yAxisMax * (5 - i) / 5);
              return (
                <div key={i} className="text-right font-mono">
                  {value}
                </div>
              );
            })}
            <div className="text-right font-mono">0</div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border-t border-slate-700/50" />
              ))}
            </div>

            {/* Bars Container */}
            <div className="relative h-80 flex items-end justify-between gap-[2px]">
              {dailyStats.map((day, index) => {
                const heightPercent = day.totalPosts === 0 
                  ? 0 
                  : Math.max((day.totalPosts / yAxisMax) * 100, 2);
                const isHovered = hoveredIndex === index;
                const barColor = getBarColor(day.totalPosts);
                const glowColor = getGlowColor(day.totalPosts);

                // Debug log for days with posts
                if (day.totalPosts > 0) {
                  console.log(`📊 Bar for ${day.dateString}:`, {
                    totalPosts: day.totalPosts,
                    heightPercent: `${heightPercent}%`,
                    yAxisMax,
                    barColor,
                  });
                }

                return (
                  <div
                    key={day.dateString}
                    className="flex-1 relative group"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ minWidth: '8px', maxWidth: '40px' }}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl py-3 px-4 shadow-2xl min-w-[180px]">
                          <div className="font-bold text-sm mb-2 text-center border-b border-slate-700 pb-2">
                            {format(day.date, 'MMM d, yyyy')}
                          </div>
                          <div className="text-center mb-2">
                            <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                              {day.totalPosts}
                            </span>
                            <span className="text-slate-400 ml-1">
                              {day.totalPosts === 1 ? 'post' : 'posts'}
                            </span>
                          </div>
                          {Object.entries(day.postsByPlatform).length > 0 && (
                            <div className="space-y-1 pt-2 border-t border-slate-700">
                              {Object.entries(day.postsByPlatform).map(([platform, count]) => (
                                <div key={platform} className="flex justify-between items-center">
                                  <span className="text-slate-400">
                                    {PLATFORM_NAMES[platform as keyof typeof PLATFORM_NAMES]}:
                                  </span>
                                  <span className="font-bold text-white">{count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Arrow */}
                        <div className="w-3 h-3 bg-slate-950 border-r border-b border-slate-700 transform rotate-45 mx-auto -mt-1.5" />
                      </div>
                    )}

                    {/* Bar */}
                    <div className="relative h-full flex items-end justify-center">
                      <div
                        className={`w-full bg-gradient-to-t ${barColor} rounded-t-lg transition-all duration-300 cursor-pointer relative overflow-hidden ${
                          isHovered ? 'scale-105' : ''
                        } ${isHovered && day.totalPosts > 0 ? glowColor : ''}`}
                        style={{ 
                          height: `${heightPercent}%`,
                        }}
                      >
                        {/* Shine effect */}
                        {day.totalPosts > 0 && (
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40" />
                        )}
                        
                        {/* Animated pulse for hovered bar */}
                        {isHovered && day.totalPosts > 0 && (
                          <div className="absolute inset-0 bg-white/30 animate-pulse" />
                        )}

                        {/* Post count on bar for higher values */}
                        {day.totalPosts >= 5 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-black text-xs drop-shadow-lg">
                              {day.totalPosts}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date label */}
                    {(index % 5 === 0 || day.date.getDate() === 1) && (
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 whitespace-nowrap font-medium">
                        {format(day.date, 'MMM d')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* X-axis label */}
        <div className="text-center mt-10 text-sm font-semibold text-slate-500">
          Date
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
        {[
          { label: 'No posts', gradient: 'from-gray-200 to-gray-300', count: '0' },
          { label: '1-3 posts', gradient: 'from-amber-400 via-orange-500 to-red-500', count: '1-3' },
          { label: '4-6 posts', gradient: 'from-blue-400 via-cyan-500 to-sky-500', count: '4-6' },
          { label: '7-9 posts', gradient: 'from-emerald-400 via-green-500 to-teal-500', count: '7-9' },
          { label: '10+ posts', gradient: 'from-purple-500 via-pink-500 to-rose-500', count: '10+' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 bg-gradient-to-br ${item.gradient} rounded-lg shadow-lg`} />
            <span className="text-xs text-slate-400 font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
          <div className="text-slate-400 text-xs mb-1">Total Posts</div>
          <div className="text-white font-black text-xl">
            {dailyStats.reduce((sum, day) => sum + day.totalPosts, 0)}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
          <div className="text-slate-400 text-xs mb-1">Best Day</div>
          <div className="text-white font-black text-xl">
            {Math.max(...dailyStats.map(d => d.totalPosts))}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
          <div className="text-slate-400 text-xs mb-1">Avg/Day</div>
          <div className="text-white font-black text-xl">
            {(dailyStats.reduce((sum, day) => sum + day.totalPosts, 0) / dailyStats.length).toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}

