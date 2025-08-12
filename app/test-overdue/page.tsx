import { OverdueDashboard } from '@/components/overdue/OverdueDashboard';

export default function TestOverduePage() {
  return (
    <div className="mx-auto px-4 py-8 container">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">Overdue Accounts Dashboard</h1>
        <p className="text-muted-foreground">
          This demonstrates overdue account checking without external cron jobs. 
          Data is calculated on-demand and can be refreshed manually or automatically.
        </p>
      </div>
      
      <OverdueDashboard />
      
      <div className="bg-muted mt-8 p-4 rounded-lg">
        <h2 className="mb-2 font-semibold text-xl">How it works:</h2>
        <ul className="space-y-1 text-muted-foreground text-sm list-disc list-inside">
          <li>No external cron jobs required - everything runs in your Next.js application</li>
          <li>Data is calculated in real-time when requested</li>
          <li>Manual refresh button for immediate updates</li>
          <li>Optional auto-refresh with configurable intervals</li>
          <li>Force refresh option to bypass any caching</li>
          <li>Real-time status indicators and currency formatting</li>
        </ul>
      </div>
    </div>
  );
}
