import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TimesInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimesInfoModal({ isOpen, onClose }: TimesInfoModalProps) {
  const { updateUserSettings } = useApp();

  const handleDontShowAgain = () => {
    updateUserSettings({ hideTimesPopup: true });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Standard Posting Times" size="lg">
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Clock className="w-8 h-8 text-blue-600" />
          <p className="text-blue-900">
            These are the optimal posting times based on audience engagement data.
          </p>
        </div>

        <div className="space-y-4">
          {/* TikTok */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-bold text-lg mb-2">TikTok (6 posts/day)</h3>
            <p className="text-sm text-gray-600 mb-2">Bangkok Time (GMT+7)</p>
            <div className="grid grid-cols-3 gap-2">
              {['05:00', '07:00', '09:00', '16:00', '18:00', '20:00'].map((time) => (
                <div key={time} className="px-3 py-2 bg-gray-50 rounded text-center font-medium">
                  {time}
                </div>
              ))}
            </div>
            <p className="text-sm text-amber-600 mt-2">⏱️ 2-hour cooldown between posts</p>
          </div>

          {/* Threads */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Threads (6 posts/day)</h3>
            <p className="text-sm text-gray-600 mb-2">Bangkok Time (GMT+7)</p>
            <div className="grid grid-cols-3 gap-2">
              {['05:10', '07:10', '09:10', '16:10', '18:10', '20:10'].map((time) => (
                <div key={time} className="px-3 py-2 bg-gray-50 rounded text-center font-medium">
                  {time}
                </div>
              ))}
            </div>
            <p className="text-sm text-amber-600 mt-2">⏱️ 2-hour cooldown between posts</p>
          </div>

          {/* Instagram */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Instagram (2 posts/day)</h3>
            <p className="text-sm text-gray-600 mb-2">Creator's Local Time</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 bg-gray-50 rounded text-center font-medium">
                09:00 (Morning)
              </div>
              <div className="px-3 py-2 bg-gray-50 rounded text-center font-medium">
                18:00 (Evening)
              </div>
            </div>
          </div>

          {/* Facebook */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Facebook (4 posts/day)</h3>
            <p className="text-sm text-gray-600 mb-2">Creator's Local Time</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 bg-gray-50 rounded text-center font-medium">
                10:00 (Morning)
              </div>
              <div className="px-3 py-2 bg-gray-50 rounded text-center font-medium">
                19:00 (Evening)
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> Times are automatically staggered by 10 minutes when you have multiple accounts.
            These are optimized for maximum engagement.
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleDontShowAgain} variant="secondary" fullWidth>
            Don't Show Again
          </Button>
          <Button onClick={onClose} fullWidth>
            Got It
          </Button>
        </div>
      </div>
    </Modal>
  );
}

