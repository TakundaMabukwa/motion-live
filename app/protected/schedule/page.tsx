import { Metadata } from 'next';
import ScheduleView from '@/components/ui-personal/schedule-view';

export const metadata: Metadata = {
  title: 'Job Schedule',
  description: 'View and manage job schedules',
};

export default function SchedulePage() {
  return (
    <div className="mx-auto px-4 py-6 container">
      <div className="mb-6">
        <h1 className="font-bold text-gray-900 text-3xl">Job Schedule</h1>
        <p className="mt-2 text-gray-600">
          View and manage job schedules. Click on any date to see the jobs scheduled for that day.
        </p>
      </div>
      
      <ScheduleView />
    </div>
  );
}
