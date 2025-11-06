import { useEffect, useState } from 'react';
import { DailyPlanSlot, PlatformAccount, Creator } from '../types';
import { PLATFORM_NAMES } from '../constants/platforms';
import { getMinutesUntil, formatCountdown } from '../utils/timezone';
import { Timer, Clock, CheckCircle } from 'lucide-react';

interface UpcomingSlotCardProps {
  slot: DailyPlanSlot;
  account: PlatformAccount;
  creator: Creator;
  accountIndex: number;
  onClick: () => void;
}

export function UpcomingSlotCard({ slot, creator, accountIndex, onClick }: UpcomingSlotCardProps) {

  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutesUntil = getMinutesUntil(slot.scheduledTimeUTC);
  const isReady = minutesUntil <= 0;
  const platformName = PLATFORM_NAMES[slot.platform];

  // Check if on cooldown based on last post
  const onCooldown = slot.status === 'cooldown' || (slot.nextEligibleTimeUTC && getMinutesUntil(slot.nextEligibleTimeUTC) > 0);
  const cooldownMinutes = slot.nextEligibleTimeUTC ? getMinutesUntil(slot.nextEligibleTimeUTC) : 0;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isReady && !onCooldown
          ? 'bg-green-50 border-green-400 hover:bg-green-100'
          : onCooldown
          ? 'bg-red-50 border-red-300 opacity-75'
          : 'bg-gray-50 border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isReady && !onCooldown ? (
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          ) : onCooldown ? (
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <Timer className="w-6 h-6 text-white" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {platformName} {accountIndex}
            </h3>
            <p className="text-sm text-gray-600">{creator.name}</p>
          </div>
        </div>

        <div className="text-right">
          {onCooldown ? (
            <>
              <div className="text-sm font-semibold text-red-700">COOLDOWN</div>
              <div className="text-2xl font-bold text-red-900">
                {formatCountdown(cooldownMinutes)}
              </div>
              <div className="text-xs text-red-600">until ready</div>
            </>
          ) : isReady ? (
            <>
              <div className="text-sm font-semibold text-green-700">READY NOW</div>
              <div className="text-3xl font-bold text-green-900">✓</div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-gray-600">IN</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCountdown(minutesUntil)}
              </div>
            </>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {slot.scheduledTimeUserTZ}
          </div>
        </div>
      </div>
    </div>
  );
}

