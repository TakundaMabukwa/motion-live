# User Activity Tracking System

Complete system to track user sessions and activity on the site.

## Features

- **Session Tracking**: Logs when users login/logout and session duration
- **Activity Logging**: Tracks all user actions (page views, creates, updates, deletes, etc.)
- **Master Dashboard**: View all user sessions and activities
- **Automatic Tracking**: Auto-logs page views and keeps sessions alive
- **Detailed Analytics**: Filter by date, user, action type

## Setup

### 1. Run Database Migration

```bash
# Apply the migration to create tables
psql -h your-db-host -U your-user -d your-db -f supabase/migrations/20260116_user_activity_tracking.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

### 2. Tables Created

- `user_sessions`: Tracks login/logout times and session duration
- `user_activity_logs`: Tracks all user actions on the site

### 3. Access Dashboard

Navigate to: `/protected/master/user-activity`

Only users with `master` role can access this dashboard.

## Usage

### Automatic Tracking

The system automatically tracks:
- Login/logout events
- Page views (every page navigation)
- Session activity (updates every minute)

### Manual Activity Logging

Use the `logActivity` function to track custom actions:

```typescript
import { logActivity } from '@/lib/activity-tracking';

// Example: Track vehicle creation
await logActivity({
  actionType: 'CREATE',
  actionDescription: 'Created new vehicle',
  resourceType: 'vehicle',
  resourceId: vehicleId,
  metadata: { reg: 'ABC123', company: 'Test Co' }
});

// Example: Track search
await logActivity({
  actionType: 'SEARCH',
  actionDescription: 'Searched for vehicles',
  metadata: { query: 'ABC', results: 5 }
});

// Example: Track export
await logActivity({
  actionType: 'EXPORT',
  actionDescription: 'Exported invoice data',
  resourceType: 'invoice',
  metadata: { format: 'excel', count: 100 }
});
```

### Available Action Types

- `LOGIN` - User logged in
- `LOGOUT` - User logged out
- `PAGE_VIEW` - User viewed a page
- `CREATE` - Created a resource
- `UPDATE` - Updated a resource
- `DELETE` - Deleted a resource
- `SEARCH` - Performed a search
- `EXPORT` - Exported data
- `DOWNLOAD` - Downloaded a file
- `UPLOAD` - Uploaded a file

## API Endpoints

### Get User Sessions
```
GET /api/user-sessions?userId=xxx&startDate=2024-01-01&endDate=2024-12-31&limit=100
```

### Get User Activity
```
GET /api/user-activity?userId=xxx&sessionId=xxx&actionType=CREATE&startDate=2024-01-01&limit=200
```

## Dashboard Features

1. **Session List**: View all user sessions with login/logout times and duration
2. **Filters**: Filter by date range
3. **Activity Details**: Click "View Activity" to see all actions in a session
4. **Real-time Status**: Shows "Active" for ongoing sessions

## Example Integration

### Track Vehicle Updates
```typescript
// In your vehicle update handler
const { error } = await supabase
  .from('vehicles')
  .update(updates)
  .eq('id', vehicleId);

if (!error) {
  await logActivity({
    actionType: 'UPDATE',
    actionDescription: `Updated vehicle ${reg}`,
    resourceType: 'vehicle',
    resourceId: vehicleId,
    metadata: { changes: updates }
  });
}
```

### Track Job Card Creation
```typescript
// In your job card creation handler
const { data, error } = await supabase
  .from('job_cards')
  .insert(jobData)
  .select()
  .single();

if (!error) {
  await logActivity({
    actionType: 'CREATE',
    actionDescription: `Created job card for ${data.vehicle_reg}`,
    resourceType: 'job_card',
    resourceId: data.id,
    metadata: { vehicle: data.vehicle_reg, technician: data.technician }
  });
}
```

## Security

- Row Level Security (RLS) enabled on both tables
- Only `master` role can view all sessions/activities
- Users can only view their own data
- API endpoints check user role before returning data

## Performance

- Indexes on user_id, timestamp, and action_type for fast queries
- Activity updates batched (every 60 seconds)
- Configurable query limits to prevent large data loads
