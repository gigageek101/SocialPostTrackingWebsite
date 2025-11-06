import { useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { Bell, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { COMMON_TIMEZONES } from '../../utils/timezone';
import { getBrowserTimezone, requestNotificationPermission } from '../../utils/helpers';

export function OnboardingScreen() {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(1);
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleTimezoneNext = () => {
    setStep(2);
  };

  const handleNotificationSetup = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    setStep(3);
  };

  const handleSkipNotifications = () => {
    setNotificationsEnabled(false);
    setStep(3);
  };

  const handleComplete = () => {
    completeOnboarding(timezone, notificationsEnabled);
  };

  const timezoneOptions = COMMON_TIMEZONES.map((tz) => ({
    value: tz,
    label: tz.replace(/_/g, ' '),
  }));

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcome to Social Post Tracker
          </h1>
          <p className="text-lg text-white/90">
            Track your posting schedule across TikTok, Threads, Instagram, and Facebook
          </p>
        </div>

        {/* Steps */}
        <Card>
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Select Your Timezone
                  </h2>
                  <p className="text-gray-600">
                    This will be used for notifications and display
                  </p>
                </div>
              </div>

              <Select
                label="Your Timezone"
                options={timezoneOptions}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Creator timezones default to Chicago (CT) but can be
                  customized per creator. Your timezone is used for notifications and your
                  personal schedule view.
                </p>
              </div>

              <Button onClick={handleTimezoneNext} fullWidth size="lg">
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Bell className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Enable Notifications
                  </h2>
                  <p className="text-gray-600">
                    Get notified when it's time to post
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900">
                  We'll send you browser notifications when your next post window opens,
                  helping you stay on schedule across all platforms.
                </p>
              </div>

              <div className="space-y-3">
                <Button onClick={handleNotificationSetup} fullWidth size="lg">
                  Enable Notifications
                </Button>
                <Button
                  onClick={handleSkipNotifications}
                  fullWidth
                  size="lg"
                  variant="secondary"
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-full">
                <svg
                  className="w-16 h-16 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  You're All Set!
                </h2>
                <p className="text-gray-600">
                  Let's start tracking your social media posts
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Next Steps:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ Add your creators and their platform accounts</li>
                  <li>✓ View your auto-generated daily schedule</li>
                  <li>✓ Log posts with one tap and complete checklists</li>
                  <li>✓ Track your progress on the calendar</li>
                </ul>
              </div>

              <Button onClick={handleComplete} fullWidth size="lg">
                Get Started
              </Button>
            </div>
          )}
        </Card>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full smooth-transition ${
                s <= step ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

