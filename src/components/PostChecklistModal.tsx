import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { AlertTriangle, Award, Timer, Play, Pause } from 'lucide-react';
import { Platform, ChecklistItem, ChecklistState, PostLogEntry } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants/platforms';

interface PostChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: Platform;
  onSubmit: (checklistState: ChecklistState, notes: string) => void;
  postLabel?: string;
  shift?: string;
  todayPosts?: PostLogEntry[];
}

export function PostChecklistModal({
  isOpen,
  onClose,
  platform,
  onSubmit,
  postLabel = 'First',
  shift = 'morning',
  todayPosts = [],
}: PostChecklistModalProps) {
  const template = CHECKLIST_TEMPLATES.find((t) => t.platform === platform);
  
  // Check if 10 DMs have been completed today
  const dmsCompletedToday = todayPosts.some(post => 
    post.checklistState.items.some(item => 
      item.id === 'tiktok-dms' && item.completed
    )
  );
  
  // Filter out DMs item if already completed today
  const templateItems = template?.items.filter(item => {
    if (item.id === 'tiktok-dms' && dmsCompletedToday) {
      return false; // Hide this item
    }
    return true;
  }) || [];
  
  // Add completion item at the beginning
  const completionItem: ChecklistItem = {
    id: 'post-completion',
    label: `${postLabel} post of ${shift} shift completed`,
    type: 'toggle',
    completed: true, // Auto-checked
  };
  
  const [items, setItems] = useState<ChecklistItem[]>([
    completionItem,
    ...templateItems.map((item) => ({ ...item, completed: false }))
  ]);
  const [notes, setNotes] = useState('');
  const [modified, setModified] = useState(false);
  
  // Timer state for scrolling activities
  const [timerActive, setTimerActive] = useState<string | null>(null); // ID of item with active timer
  const [timerSeconds, setTimerSeconds] = useState(180); // 3 minutes = 180 seconds
  const [timerPaused, setTimerPaused] = useState(false);

  const handleToggle = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleCountChange = (id: string, newCount: number) => {
    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const isModified = item.recommendedCount !== undefined && 
                           newCount !== item.recommendedCount;
          if (isModified && !modified) {
            setModified(true);
          }
          return { ...item, count: newCount };
        }
        return item;
      });
      return updated;
    });
  };

  // Timer effect
  useEffect(() => {
    if (!timerActive || timerPaused || timerSeconds <= 0) return;
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          // Timer completed! Auto-tick the box
          setItems(prevItems =>
            prevItems.map(item =>
              item.id === timerActive ? { ...item, completed: true } : item
            )
          );
          setTimerActive(null);
          setTimerSeconds(180);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timerActive, timerPaused, timerSeconds]);

  const startTimer = (itemId: string) => {
    setTimerActive(itemId);
    setTimerSeconds(180);
    setTimerPaused(false);
  };

  const pauseTimer = () => {
    setTimerPaused(!timerPaused);
  };

  const stopTimer = () => {
    setTimerActive(null);
    setTimerSeconds(180);
    setTimerPaused(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    const checklistState: ChecklistState = {
      platform,
      items,
      modified,
    };
    
    onSubmit(checklistState, notes);
    
    // Reset
    setItems(templateItems.map((item) => ({ ...item, completed: false })));
    setNotes('');
    setModified(false);
    stopTimer();
  };

  if (!template) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Time for Interacting! 🎯" size="lg">
      <div className="space-y-6">
        {/* Post Completion Notice */}
        <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
          <Award className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900 text-lg">✓ Post Logged & Cooldown Started!</h3>
            <p className="text-sm text-green-700">
              Complete these interactions while your cooldown timer runs in the background
            </p>
          </div>
        </div>

        {/* Warning if modified */}
        {modified && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <p className="text-sm text-amber-900">
              <strong>Warning:</strong> You've changed the recommended counts. 
              This may affect your results.
            </p>
          </div>
        )}

        {/* Checklist Items */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 text-lg">Now it's time for:</h3>
          
          {items.map((item, index) => {
            // Check if this item should have a timer (view stories / scrolling)
            const needsTimer = item.id === 'tiktok-view-stories' || item.label.toLowerCase().includes('scroll');
            const isTimerActive = timerActive === item.id;
            
            return (
            <div
              key={item.id}
              className={`p-4 rounded-lg smooth-transition ${
                index === 0 
                  ? 'bg-green-50 border-2 border-green-300' 
                  : isTimerActive 
                  ? 'bg-blue-50 border-2 border-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-4">
                {item.type === 'toggle' ? (
                  <>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggle(item.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus-ring"
                      disabled={isTimerActive}
                    />
                    <label className="flex-1 text-gray-900 cursor-pointer">
                      {item.label}
                    </label>
                  </>
                ) : (
                  <>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggle(item.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus-ring"
                    />
                    <label className="flex-1 text-gray-900">{item.label}</label>
                    <input
                      type="number"
                      min="0"
                      value={item.count || 0}
                      onChange={(e) =>
                        handleCountChange(item.id, parseInt(e.target.value) || 0)
                      }
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus-ring"
                    />
                    {item.recommendedCount && (
                      <span className="text-sm text-gray-600">
                        (Rec: {item.recommendedCount})
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Timer UI for scrolling activities */}
              {needsTimer && !item.completed && (
                <div className="mt-3 pt-3 border-t-2 border-gray-200">
                  {!isTimerActive ? (
                    <Button
                      onClick={() => startTimer(item.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                      size="sm"
                    >
                      <Play className="w-4 h-4" />
                      Start 3-Minute Timer
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-mono text-xl font-bold">
                        <Timer className="w-5 h-5" />
                        {formatTime(timerSeconds)}
                      </div>
                      <Button
                        onClick={pauseTimer}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        size="sm"
                      >
                        {timerPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={stopTimer}
                        variant="secondary"
                        size="sm"
                      >
                        Stop
                      </Button>
                    </div>
                  )}
                  {isTimerActive && (
                    <p className="text-xs text-blue-600 mt-2">
                      ⏳ Box will auto-tick when timer completes
                    </p>
                  )}
                </div>
              )}
            </div>
          )})}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add any notes about this post..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring smooth-transition resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleSubmit} fullWidth size="lg">
            Save & Complete
          </Button>
          <Button onClick={onClose} fullWidth size="lg" variant="secondary">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

