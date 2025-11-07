import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { format } from 'date-fns';

interface BackdatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customTime: Date, postLink: string) => void;
  platformName: string;
  accountName: string;
  postNumber: number;
}

export function BackdatePostModal({
  isOpen,
  onClose,
  onSubmit,
  platformName,
  accountName,
  postNumber,
}: BackdatePostModalProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [postLink, setPostLink] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!postLink.trim()) {
      setError('Post link is required');
      return;
    }

    // Validate URL format
    try {
      new URL(postLink);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    // Combine date and time
    const customDateTime = new Date(`${date}T${time}`);
    
    // Check if date is not in the future
    if (customDateTime > new Date()) {
      setError('Cannot backdate to a future time');
      return;
    }

    onSubmit(customDateTime, postLink);
    
    // Reset form
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTime(format(new Date(), 'HH:mm'));
    setPostLink('');
    setError('');
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="I Posted Earlier">
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-1">
            {platformName} - {accountName}
          </p>
          <p className="text-xs text-blue-700">
            Post #{postNumber}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            When did you post? (Your timezone)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Time</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Link <span className="text-red-500">*</span>
          </label>
          <Input
            type="url"
            value={postLink}
            onChange={(e) => {
              setPostLink(e.target.value);
              setError('');
            }}
            placeholder="https://..."
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste the direct link to your post
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <p className="text-xs text-yellow-800">
            ⚠️ <strong>Note:</strong> This will record that you posted at the selected time.
            Make sure the cooldown period is respected for accurate scheduling.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSubmit}
            className="flex-1"
          >
            ✓ Save Post
          </Button>
          <Button
            variant="ghost"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

