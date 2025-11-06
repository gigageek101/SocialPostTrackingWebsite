import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { AlertTriangle, Award } from 'lucide-react';
import { Platform, ChecklistItem, ChecklistState } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants/platforms';

interface PostChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: Platform;
  onSubmit: (checklistState: ChecklistState, notes: string) => void;
}

export function PostChecklistModal({
  isOpen,
  onClose,
  platform,
  onSubmit,
}: PostChecklistModalProps) {
  const template = CHECKLIST_TEMPLATES.find((t) => t.platform === platform);
  
  const [items, setItems] = useState<ChecklistItem[]>(
    template?.items.map((item) => ({ ...item, completed: false })) || []
  );
  const [notes, setNotes] = useState('');
  const [modified, setModified] = useState(false);

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

  const handleSubmit = () => {
    const checklistState: ChecklistState = {
      platform,
      items,
      modified,
    };
    
    onSubmit(checklistState, notes);
    
    // Reset
    setItems(template?.items.map((item) => ({ ...item, completed: false })) || []);
    setNotes('');
    setModified(false);
  };

  if (!template) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Post Checklist" size="lg">
      <div className="space-y-6">
        {/* Recommended Protocol Badge */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Award className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-900">{template.recommendedProtocol}</h3>
            <p className="text-sm text-blue-700">
              Follow this method for best results
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
          <h3 className="font-semibold text-gray-900">Tasks to Complete:</h3>
          
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 smooth-transition"
            >
              {item.type === 'toggle' ? (
                <>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggle(item.id)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus-ring"
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
          ))}
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

