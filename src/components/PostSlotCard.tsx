import { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { PlatformIcon } from './ui/PlatformIcon';
import { Clock, CheckCircle, Timer } from 'lucide-react';
import { DailyPlanSlot, PlatformAccount, Creator } from '../types';
import { PLATFORM_NAMES, PLATFORM_COLORS } from '../constants/platforms';
import { getMinutesUntil, formatCountdown, isBeforeNow } from '../utils/timezone';

interface PostSlotCardProps {
  slot: DailyPlanSlot;
  account: PlatformAccount;
  creator: Creator;
  onPost: () => void;
  onSkip: () => void;
}

export function PostSlotCard({ slot, account, creator, onPost, onSkip }: PostSlotCardProps) {
  const [countdown, setCountdown] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      if (slot.status === 'posted') return;
      
      if (slot.status === 'cooldown' && slot.nextEligibleTimeUTC) {
        const minutes = getMinutesUntil(slot.nextEligibleTimeUTC);
        setCountdown(formatCountdown(minutes));
        setIsReady(minutes <= 0);
      } else {
        const minutes = getMinutesUntil(slot.scheduledTimeUTC);
        setCountdown(formatCountdown(minutes));
        setIsReady(isBeforeNow(slot.scheduledTimeUTC));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [slot]);

  const getStatusDisplay = () => {
    switch (slot.status) {
      case 'posted':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Posted</span>
          </div>
        );
      case 'cooldown':
        return (
          <div className="flex items-center gap-2 text-amber-600">
            <Timer className="w-5 h-5" />
            <span className="font-medium">Cooldown: {countdown}</span>
          </div>
        );
      case 'skipped':
        return (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="font-medium">Skipped</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{isReady ? 'Ready now' : `In ${countdown}`}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const canPost = slot.status === 'pending' && isReady;

  return (
    <Card className="hover:shadow-lg smooth-transition">
      <div className="flex items-start justify-between gap-4">
        {/* Left side - Platform and Account Info */}
        <div className="flex items-start gap-4 flex-1">
          <div className={`p-3 rounded-lg ${PLATFORM_COLORS[slot.platform]}`}>
            <PlatformIcon platform={slot.platform} className="w-6 h-6" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900">{PLATFORM_NAMES[slot.platform]}</h3>
              <span className="text-sm text-gray-600">{account.handle}</span>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{creator.name}</p>
            
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Creator:</span>
                <span className="font-medium text-gray-900">
                  {slot.scheduledTimeCreatorTZ}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">You:</span>
                <span className="font-medium text-gray-900">
                  {slot.scheduledTimeUserTZ}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Status and Actions */}
        <div className="flex flex-col items-end gap-3">
          {getStatusDisplay()}
          
          {slot.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onPost}
                disabled={!canPost}
              >
                I Just Posted
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onSkip}
              >
                Skip
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

