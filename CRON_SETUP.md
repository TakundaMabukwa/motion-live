# Overdue Account Checking - Multiple Approaches

This document explains different approaches for checking overdue accounts, including both external cron jobs and application-level alternatives.

## Option 4: Application-Level Scheduling (Recommended Alternative)

Instead of external cron jobs, you can use the built-in application-level scheduling that provides real-time overdue checking with manual and automatic refresh capabilities.

### New API Endpoints

**Primary Endpoint:** `/api/overdue-check`
- **GET:** Fetch current overdue data
- **POST:** Force refresh from database (bypasses any caching)

**Legacy Endpoint:** `/api/cron/check-overdue` (still available for external cron if needed)

### React Components

The following components are available for easy integration:

- **`OverdueAccountsWidget`**: Displays overdue accounts with refresh controls
- **`OverdueDashboard`**: Complete dashboard with summary cards and controls
- **Custom hooks**: `useOverdueCheck`, `useOverdueSummary`, `useTopOverdueAccounts`

### Usage Examples

#### Basic Widget
```tsx
import { OverdueAccountsWidget } from '@/components/overdue/OverdueAccountsWidget';

<OverdueAccountsWidget 
  autoRefresh={true} 
  refreshInterval={300000} // 5 minutes
  showAllAccounts={false}
  maxAccounts={10}
/>
```

#### Complete Dashboard
```tsx
import { OverdueDashboard } from '@/components/overdue/OverdueDashboard';

<OverdueDashboard />
```

#### Custom Hook
```tsx
import { useOverdueCheck } from '@/lib/hooks/useOverdueCheck';

const { data, loading, error, refresh, forceRefresh } = useOverdueCheck(true, 300000);
```

### Features

- ✅ **No external dependencies** - Everything runs in your Next.js app
- ✅ **Real-time calculations** - Data is always current when requested
- ✅ **Manual refresh** - Update data on-demand
- ✅ **Auto-refresh** - Configurable intervals (1 min to 1 hour)
- ✅ **Force refresh** - Bypass any caching for immediate updates
- ✅ **Real-time status** - Visual indicators for overdue severity
- ✅ **Responsive design** - Works on all device sizes
- ✅ **Toast notifications** - User feedback for actions
- ✅ **Error handling** - Graceful fallbacks and retry options

### Test Page

Visit `/test-overdue` to see the complete dashboard in action.

---

## Option 1: Vercel Cron Jobs (External)

If you prefer external cron jobs, you can still use Vercel's built-in cron functionality.

### Vercel Configuration

Add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-overdue?secret=your-cron-secret-here",
      "schedule": "0 6 * * *"
    }
  ]
}
```

## Option 2: External Cron Services

Use services like cron-job.org, EasyCron, or SetCronJob to call the legacy endpoint.

## Option 3: Server Cron (Linux/Unix)

Add to your server's crontab:

```bash
0 6 * * * curl "https://yourdomain.com/api/cron/check-overdue?secret=your-cron-secret-here"
```

## What the System Does

1. **Calculates overdue amounts** based on:
   - Payment due date: 21st of each month
   - Current date vs. due date
   - Monthly billing amounts from `vehicle_invoices` table
2. **Processes all accounts** and identifies overdue ones
3. **Provides real-time data** through API endpoints
4. **Offers flexible refresh options** for different use cases

## Recommendation

**Use Option 4 (Application-Level Scheduling)** for most use cases because it:
- Eliminates external dependencies
- Provides real-time data
- Offers better user experience
- Is easier to maintain and debug
- Integrates seamlessly with your React components

Only use external cron jobs if you specifically need:
- Scheduled notifications to external systems
- Integration with external monitoring tools
- Server-side logging that persists across deployments

## Testing

Test the new endpoints:

```bash
# Get current overdue data
curl "https://yourdomain.com/api/overdue-check"

# Force refresh from database
curl -X POST "https://yourdomain.com/api/overdue-check" \
  -H "Content-Type: application/json" \
  -d '{"forceRefresh": true}'
```

## Support

If you encounter issues:
1. Check the application logs
2. Test the API endpoints manually
3. Verify database connectivity
4. Check that all required tables exist
