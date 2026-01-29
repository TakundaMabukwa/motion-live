import UniversalLayout from '@/components/shared/UniversalLayout';
import { ActivityTracker } from '@/components/activity-tracker';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UniversalLayout currentRole="protected">
      <ActivityTracker />
      <main className="min-h-screen bg-background">
        <div className="w-full">
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>
    </UniversalLayout>
  );
}
