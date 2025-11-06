import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PostSlotCard } from '../PostSlotCard';
import { PostChecklistModal } from '../PostChecklistModal';
import { Calendar, Filter, RefreshCw, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Platform, DailyPlanSlot, ChecklistState } from '../../types';
import { format } from 'date-fns';
import { PLATFORM_NAMES } from '../../constants/platforms';

export function ScheduleOverviewScreen() {
  const { state, getTodayPlan, refreshDailyPlan, logPost, updateSlotStatus, setCurrentScreen } =
    useApp();
    
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedSlot, setSelectedSlot] = useState<DailyPlanSlot | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);

  const todayPlan = getTodayPlan();

  useEffect(() => {
    // Refresh plan on mount
    refreshDailyPlan();
  }, []);

  const handlePostClick = (slot: DailyPlanSlot) => {
    setSelectedSlot(slot);
    setShowChecklist(true);
  };

  const handleChecklistSubmit = (checklistState: ChecklistState, notes: string) => {
    if (selectedSlot) {
      logPost(selectedSlot.id, checklistState, notes);
      setShowChecklist(false);
      setSelectedSlot(null);
    }
  };

  const handleSkip = (slotId: string) => {
    updateSlotStatus(slotId, 'skipped');
  };

  // Filter slots
  const filteredSlots = todayPlan?.slots.filter((slot) => {
    if (filterPlatform !== 'all' && slot.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && slot.status !== filterStatus) return false;
    return true;
  }) || [];

  // Get stats
  const stats = {
    total: todayPlan?.slots.length || 0,
    posted: todayPlan?.slots.filter((s) => s.status === 'posted').length || 0,
    pending: todayPlan?.slots.filter((s) => s.status === 'pending').length || 0,
    cooldown: todayPlan?.slots.filter((s) => s.status === 'cooldown').length || 0,
  };

  if (!state.userSettings) return null;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Today's Schedule</h1>
            </div>
            <p className="text-white/90 text-lg">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-4xl font-bold">
              {stats.posted}/{stats.total}
            </div>
            <p className="text-white/90">Posts Completed</p>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200 border">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-sm text-blue-900 mt-1">Total Scheduled</p>
          </div>
        </Card>
        
        <Card className="bg-green-50 border-green-200 border">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.posted}</div>
            <p className="text-sm text-green-900 mt-1">Posted</p>
          </div>
        </Card>
        
        <Card className="bg-amber-50 border-amber-200 border">
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">{stats.cooldown}</div>
            <p className="text-sm text-amber-900 mt-1">On Cooldown</p>
          </div>
        </Card>
        
        <Card className="bg-purple-50 border-purple-200 border">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.pending}</div>
            <p className="text-sm text-purple-900 mt-1">Pending</p>
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus-ring"
          >
            <option value="all">All Platforms</option>
            {Object.entries(PLATFORM_NAMES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus-ring"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="posted">Posted</option>
            <option value="cooldown">Cooldown</option>
            <option value="skipped">Skipped</option>
          </select>
          
          <div className="ml-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshDailyPlan}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Post Slots */}
      {state.accounts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center p-4 bg-gray-100 rounded-full mb-4">
              <Plus className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Accounts Added Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Add creators and their accounts to start scheduling posts
            </p>
            <Button onClick={() => setCurrentScreen('creators')}>
              <Plus className="w-5 h-5 mr-2" />
              Add Creators & Accounts
            </Button>
          </div>
        </Card>
      ) : filteredSlots.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600">No posts match your filters</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSlots.map((slot) => {
            const account = state.accounts.find((a) => a.id === slot.accountId);
            const creator = state.creators.find(
              (c) => c.id === account?.creatorId
            );
            
            if (!account || !creator) return null;
            
            return (
              <PostSlotCard
                key={slot.id}
                slot={slot}
                account={account}
                creator={creator}
                onPost={() => handlePostClick(slot)}
                onSkip={() => handleSkip(slot.id)}
              />
            );
          })}
        </div>
      )}

      {/* Checklist Modal */}
      {selectedSlot && (
        <PostChecklistModal
          isOpen={showChecklist}
          onClose={() => {
            setShowChecklist(false);
            setSelectedSlot(null);
          }}
          platform={selectedSlot.platform}
          onSubmit={handleChecklistSubmit}
        />
      )}
    </div>
  );
}

