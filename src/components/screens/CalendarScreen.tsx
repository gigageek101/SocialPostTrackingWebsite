import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PlatformIcon } from '../ui/PlatformIcon';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format, addDays, startOfDay } from 'date-fns';
import { PLATFORM_NAMES } from '../../constants/platforms';

export function CalendarScreen() {
  const { state } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateKey = format(startOfDay(selectedDate), 'yyyy-MM-dd');
  const plan = state.dailyPlans.find((p) => p.date === dateKey);

  const goToPreviousDay = () => {
    setSelectedDate((prev) => addDays(prev, -1));
  };

  const goToNextDay = () => {
    setSelectedDate((prev) => addDays(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const stats = plan
    ? {
        total: plan.slots.length,
        posted: plan.slots.filter((s) => s.status === 'posted').length,
        pending: plan.slots.filter((s) => s.status === 'pending').length,
        skipped: plan.slots.filter((s) => s.status === 'skipped').length,
      }
    : { total: 0, posted: 0, pending: 0, skipped: 0 };

  return (
    <div className="space-y-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-white" />
          <h1 className="text-3xl font-bold text-white">Calendar</h1>
        </div>
      </div>

      {/* Date Navigator */}
      <Card>
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={goToPreviousDay}>
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {format(selectedDate, 'EEEE')}
            </h2>
            <p className="text-gray-600">{format(selectedDate, 'MMMM d, yyyy')}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={goToToday}>
              Today
            </Button>
            <Button variant="secondary" onClick={goToNextDay}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {plan && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200 border">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-sm text-blue-900 mt-1">Scheduled</p>
            </div>
          </Card>

          <Card className="bg-green-50 border-green-200 border">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.posted}</div>
              <p className="text-sm text-green-900 mt-1">Posted</p>
            </div>
          </Card>

          <Card className="bg-amber-50 border-amber-200 border">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <p className="text-sm text-amber-900 mt-1">Pending</p>
            </div>
          </Card>

          <Card className="bg-gray-50 border-gray-200 border">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.skipped}</div>
              <p className="text-sm text-gray-900 mt-1">Skipped</p>
            </div>
          </Card>
        </div>
      )}

      {/* Slots List */}
      {!plan ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600">No schedule for this date</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {plan.slots.map((slot) => {
            const account = state.accounts.find((a) => a.id === slot.accountId);
            const creator = state.creators.find((c) => c.id === account?.creatorId);
            const postLog = slot.postLogId
              ? state.postLogs.find((p) => p.id === slot.postLogId)
              : null;

            if (!account || !creator) return null;

            const statusColors = {
              posted: 'bg-green-50 border-green-200',
              pending: 'bg-blue-50 border-blue-200',
              cooldown: 'bg-amber-50 border-amber-200',
              skipped: 'bg-gray-50 border-gray-200',
            };

            const statusLabels = {
              posted: 'Posted',
              pending: 'Pending',
              cooldown: 'On Cooldown',
              skipped: 'Skipped',
            };

            return (
              <Card
                key={slot.id}
                className={`border ${statusColors[slot.status]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <PlatformIcon platform={slot.platform} className="w-6 h-6 mt-1" />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">
                          {PLATFORM_NAMES[slot.platform]}
                        </h3>
                        <span className="text-sm text-gray-600">{account.handle}</span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-700">
                        <p>Scheduled: {slot.scheduledTimeCreatorTZ} (Creator)</p>
                        {postLog && (
                          <>
                            <p>Posted: {postLog.timestampCreatorTZ}</p>
                            {postLog.notes && (
                              <p className="text-gray-600 italic mt-2">
                                Note: {postLog.notes}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        slot.status === 'posted'
                          ? 'bg-green-100 text-green-800'
                          : slot.status === 'pending'
                          ? 'bg-blue-100 text-blue-800'
                          : slot.status === 'cooldown'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {statusLabels[slot.status]}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

