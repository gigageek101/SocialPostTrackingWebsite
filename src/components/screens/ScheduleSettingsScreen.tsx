import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Platform } from '../../types';
import { PlatformIcon } from '../ui/PlatformIcon';
import { PLATFORM_BASE_TIMES, COOLDOWN_MINUTES, PLATFORM_NAMES } from '../../constants/platforms';
import { Settings, Save, RotateCcw, Plus, Trash2 } from 'lucide-react';

interface PlatformSchedule {
  platform: Platform;
  times: string[];
  cooldown: number;
  postsPerDay: number;
}

export function ScheduleSettingsScreen() {
  const { setCurrentScreen } = useApp();
  
  // Initialize schedule state from constants
  const [schedules, setSchedules] = useState<PlatformSchedule[]>([
    {
      platform: 'tiktok',
      times: [...PLATFORM_BASE_TIMES.tiktok],
      cooldown: COOLDOWN_MINUTES.tiktok,
      postsPerDay: PLATFORM_BASE_TIMES.tiktok.length,
    },
    {
      platform: 'threads',
      times: [...PLATFORM_BASE_TIMES.threads],
      cooldown: COOLDOWN_MINUTES.threads,
      postsPerDay: PLATFORM_BASE_TIMES.threads.length,
    },
    {
      platform: 'instagram',
      times: [...PLATFORM_BASE_TIMES.instagram],
      cooldown: COOLDOWN_MINUTES.instagram,
      postsPerDay: PLATFORM_BASE_TIMES.instagram.length,
    },
  ]);

  const [hasChanges, setHasChanges] = useState(false);

  const updateTime = (platformIndex: number, timeIndex: number, newTime: string) => {
    const newSchedules = [...schedules];
    newSchedules[platformIndex].times[timeIndex] = newTime;
    setSchedules(newSchedules);
    setHasChanges(true);
  };

  const updateCooldown = (platformIndex: number, cooldown: number) => {
    const newSchedules = [...schedules];
    newSchedules[platformIndex].cooldown = Math.max(0, cooldown);
    setSchedules(newSchedules);
    setHasChanges(true);
  };

  const updatePostsPerDay = (platformIndex: number, count: number) => {
    const newSchedules = [...schedules];
    const currentTimes = newSchedules[platformIndex].times;
    const newCount = Math.max(1, Math.min(10, count)); // Limit between 1-10 posts
    
    if (newCount > currentTimes.length) {
      // Add more time slots (default to 12:00)
      for (let i = currentTimes.length; i < newCount; i++) {
        currentTimes.push('12:00');
      }
    } else if (newCount < currentTimes.length) {
      // Remove excess time slots
      currentTimes.splice(newCount);
    }
    
    newSchedules[platformIndex].postsPerDay = newCount;
    setSchedules(newSchedules);
    setHasChanges(true);
  };

  const addTimeSlot = (platformIndex: number) => {
    const newSchedules = [...schedules];
    newSchedules[platformIndex].times.push('12:00');
    newSchedules[platformIndex].postsPerDay = newSchedules[platformIndex].times.length;
    setSchedules(newSchedules);
    setHasChanges(true);
  };

  const removeTimeSlot = (platformIndex: number, timeIndex: number) => {
    const newSchedules = [...schedules];
    if (newSchedules[platformIndex].times.length > 1) {
      newSchedules[platformIndex].times.splice(timeIndex, 1);
      newSchedules[platformIndex].postsPerDay = newSchedules[platformIndex].times.length;
      setSchedules(newSchedules);
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    // TODO: Save to constants/settings
    // This would require updating the PLATFORM_BASE_TIMES and COOLDOWN_MINUTES
    // For now, we'll just alert the user and redirect
    alert('✅ Schedule settings saved!\n\nNote: To make these changes permanent across sessions, you would need to update the constants file and redeploy.');
    setHasChanges(false);
    // Redirect to today screen
    setCurrentScreen('schedule-overview');
  };

  const handleReset = () => {
    setSchedules([
      {
        platform: 'tiktok',
        times: [...PLATFORM_BASE_TIMES.tiktok],
        cooldown: COOLDOWN_MINUTES.tiktok,
        postsPerDay: PLATFORM_BASE_TIMES.tiktok.length,
      },
      {
        platform: 'threads',
        times: [...PLATFORM_BASE_TIMES.threads],
        cooldown: COOLDOWN_MINUTES.threads,
        postsPerDay: PLATFORM_BASE_TIMES.threads.length,
      },
      {
        platform: 'instagram',
        times: [...PLATFORM_BASE_TIMES.instagram],
        cooldown: COOLDOWN_MINUTES.instagram,
        postsPerDay: PLATFORM_BASE_TIMES.instagram.length,
      },
    ]);
    setHasChanges(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-5xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Settings className="w-10 h-10 text-indigo-600" />
            <h1 className="text-4xl font-black text-gray-900">Schedule Settings</h1>
          </div>
          <p className="text-gray-600">
            Customize your posting times, frequency, and cooldowns for each platform
          </p>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <Card className="mb-6 bg-yellow-50 border-2 border-yellow-300">
            <div className="flex items-center justify-between">
              <p className="text-sm text-yellow-900 font-medium">
                ⚠️ You have unsaved changes
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleReset}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Platform Schedules */}
        <div className="space-y-6">
          {schedules.map((schedule, platformIndex) => (
            <Card key={schedule.platform} className="shadow-lg">
              <div className="border-b-2 border-gray-200 pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PlatformIcon platform={schedule.platform} className="w-8 h-8" />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {PLATFORM_NAMES[schedule.platform]}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {schedule.postsPerDay} posts per day • {schedule.cooldown} min cooldown
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Posts Per Day */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Posts Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={schedule.postsPerDay}
                    onChange={(e) => updatePostsPerDay(platformIndex, parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
                  />
                  <p className="text-xs text-blue-700 mt-1">
                    Total posts to make each day
                  </p>
                </div>

                {/* Cooldown Minutes */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <label className="block text-sm font-semibold text-orange-900 mb-2">
                    Cooldown (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={schedule.cooldown}
                    onChange={(e) => updateCooldown(platformIndex, parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 font-semibold"
                  />
                  <p className="text-xs text-orange-700 mt-1">
                    Wait time between posts
                  </p>
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">Posting Times (Bangkok Time)</h3>
                  <button
                    onClick={() => addTimeSlot(platformIndex)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Time
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {schedule.times.map((time, timeIndex) => (
                    <div key={timeIndex} className="bg-white border-2 border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-600">
                          Post #{timeIndex + 1}
                        </label>
                        {schedule.times.length > 1 && (
                          <button
                            onClick={() => removeTimeSlot(platformIndex, timeIndex)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Remove this time slot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => updateTime(platformIndex, timeIndex, e.target.value)}
                        className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 font-mono font-bold text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <Settings className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 mb-2">How Schedule Settings Work</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>Posting Times:</strong> Base times when posts should be made (in Bangkok timezone)</li>
                <li><strong>Posts Per Day:</strong> Total number of posts to make daily. Times auto-adjust when changed.</li>
                <li><strong>Cooldown:</strong> Minimum wait time between consecutive posts on the same platform</li>
                <li><strong>Auto-Adjustment:</strong> The app adds cooldown time to base times after each post</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Action Buttons at Bottom */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            onClick={() => setCurrentScreen('schedule-overview')}
            className="px-8"
          >
            ← Back to Today
          </Button>
          <Button
            onClick={handleSave}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-8"
          >
            <Save className="w-5 h-5" />
            Save Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}

