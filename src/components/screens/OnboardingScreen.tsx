import { useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import { COMMON_TIMEZONES } from '../../utils/timezone';
import { getBrowserTimezone } from '../../utils/helpers';

export function OnboardingScreen() {
  const { completeOnboarding } = useApp();
  const [timezone, setTimezone] = useState(getBrowserTimezone());

  const handleStart = () => {
    completeOnboarding(timezone, false);
  };

  const timezoneOptions = COMMON_TIMEZONES.map((tz) => ({
    value: tz,
    label: tz.replace(/_/g, ' '),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-4xl font-black text-gray-900 mb-3">
            Post Tracker
          </h1>
          <p className="text-lg text-gray-600">
            Simple social media posting management
          </p>
        </div>

        <div className="space-y-6">
          <Select
            label="Select Your Timezone"
            options={timezoneOptions}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>What's next?</strong> Add your creators and accounts, then start clocking in for posts at the scheduled times.
            </p>
          </div>

          <Button onClick={handleStart} fullWidth size="lg" className="text-xl py-6">
            Get Started
          </Button>
        </div>
      </Card>
    </div>
  );
}
