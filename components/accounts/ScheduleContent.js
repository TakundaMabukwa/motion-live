'use client';

import ScheduleView from '@/components/ui-personal/schedule-view';

export default function ScheduleContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Job Schedule</h2>
        <div className="text-sm text-gray-500">View and manage job schedules</div>
      </div>
      
      <ScheduleView />
    </div>
  );
}
