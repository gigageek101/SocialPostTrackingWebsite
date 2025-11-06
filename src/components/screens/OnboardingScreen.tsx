import { useEffect } from 'react';
import { Card } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import { getBrowserTimezone } from '../../utils/helpers';

export function OnboardingScreen() {
  const { completeOnboarding } = useApp();

  useEffect(() => {
    // Auto-detect timezone and start automatically
    const detectedTimezone = getBrowserTimezone();
    completeOnboarding(detectedTimezone, false);
  }, [completeOnboarding]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🚀</div>
          <h1 className="text-4xl font-black text-gray-900 mb-3">
            Setting Up...
          </h1>
          <p className="text-lg text-gray-600">
            Detecting your timezone and initializing
          </p>
        </div>
      </Card>
    </div>
  );
}
