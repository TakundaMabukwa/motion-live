# Technician Scheduling System

This document explains how the technician scheduling system works, including conflict detection and validation.

## Overview

The system prevents technicians from being double-booked by checking for scheduling conflicts within a configurable time window (default: 3 hours before and after the requested time).

## Database Schema

The scheduling system works with the existing `job_cards` table, focusing on these key fields:

```sql
create table public.job_cards (
  id uuid not null default gen_random_uuid (),
  job_number character varying(50) not null,
  job_date timestamp with time zone null default now(),
  start_time timestamp with time zone null,
  end_time timestamp with time zone null,
  status character varying(20) null default 'pending'::character varying,
  technician_name character varying(255) null,
  /* other fields omitted for brevity */
)
```

## Key Components

### 1. SQL Function: `check_technician_availability`

- Implemented as a PostgreSQL function
- Checks for scheduling conflicts within a specified time window
- Returns detailed information about conflicting jobs

### 2. API Endpoint: `/api/technicians/availability`

- REST endpoint for checking technician availability
- Query parameters:
  - `technician`: Name of the technician to check
  - `date`: Date for the job (YYYY-MM-DD)
  - `time`: Time for the job (HH:MM, defaults to 09:00)
  - `buffer`: Hours to check before/after (defaults to 3)
- Returns a JSON object with availability status and conflicting jobs

### 3. Helper Library: `lib/technician-scheduling.ts`

- TypeScript utility for checking technician availability
- Can use either the API endpoint or direct database queries
- Handles error cases and provides consistent return format

### 4. UI Integration in Admin Page

- Real-time conflict detection when assigning technicians
- Visual warning displays for conflicting jobs
- Allow admin users to override conflicts when necessary

## How It Works

1. **Assignment Process**:
   - Admin selects a technician, date, and time for job assignment
   - System checks for conflicts using the `checkTechnicianAvailability` function
   - If conflicts are found, displays warning with details
   - Admin can either select a different time/technician or override the warning

2. **Conflict Detection**:
   - System looks for jobs assigned to the same technician
   - Checks both `job_date` and `start_time` fields
   - Only considers active jobs (not cancelled or completed)
   - Default time window is 3 hours before and after selected time

3. **Implementation**:
   - Direct database queries check if any jobs fall within the buffer window
   - API endpoint provides a REST interface for the same functionality
   - UI components highlight conflicts and show relevant job information

## Usage Examples

### Using the API

```typescript
// Fetch availability information
const response = await fetch(
  '/api/technicians/availability?' +
  'technician=John%20Doe&' +
  'date=2025-10-09&' +
  'time=14:00&' +
  'buffer=3'
);
const data = await response.json();

if (!data.isAvailable) {
  console.log(`${data.conflictCount} conflicts found`);
  console.log(data.conflictingJobs);
}
```

### Using the Helper Function

```typescript
import { checkTechnicianAvailability } from '@/lib/technician-scheduling';

// Check availability
const result = await checkTechnicianAvailability(
  'John Doe',     // technician name
  '2025-10-09',   // date
  '14:00',        // time
  3               // buffer hours (optional)
);

if (!result.isAvailable) {
  console.log(`Conflicts found: ${result.conflictingJobs.length}`);
  // Show warning to user
}
```

## Best Practices

1. **Always validate** before final job assignment
2. **Provide clear warnings** when conflicts are detected
3. **Allow override capability** for admins with appropriate permissions
4. **Keep logs** of overridden scheduling conflicts
5. **Notify technicians** when their schedule has been modified