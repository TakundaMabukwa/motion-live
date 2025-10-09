# Technician Scheduling Validation System

This system ensures that technicians are not double-booked for jobs by implementing a 3-hour buffer validation rule.

## Overview

The technician scheduling validation system prevents scheduling conflicts by:

1. Checking for existing assignments within a 3-hour window of a proposed booking
2. Warning users about potential conflicts
3. Allowing administrators to override conflicts when necessary
4. Enforcing validation at both the database and application levels

## Implementation Details

### Database-Level Validation

The system uses PostgreSQL functions and triggers to enforce validation rules directly at the database level:

- **SQL Functions**:
  - `check_technician_availability()`: Checks if a technician has conflicting jobs
  - `validate_technician_booking()`: Trigger function that prevents double-booking
  - `assign_technician_with_override()`: Function for assigning with override capability

### API Endpoints

- **GET /api/technicians/availability**: Checks technician availability for a specific time
  - Parameters: technician, date, time, buffer (hours)
  - Returns availability status and any conflicting jobs

- **POST /api/technicians/availability**: Assigns a technician with conflict validation
  - Parameters: jobId, technicianName, jobDate, startTime, override
  - Supports conflict override when explicitly authorized

### Frontend Components

- **React Hook**: `useTechnicianAvailability()`
  - Provides functions for checking availability and assigning technicians
  - Handles loading states, errors, and conflict detection

- **Admin Interface Updates**:
  - Visual warnings for scheduling conflicts
  - Conflict details display
  - Confirmation prompts for override decisions

## How It Works

1. **User selects a technician and time**:
   - The system immediately checks for conflicts in the 3-hour window
   - If conflicts exist, the user is shown details about those jobs

2. **For new assignments**:
   - Validation occurs at both frontend and API levels
   - Database triggers provide final validation as a failsafe

3. **If conflicts are detected**:
   - Admin users can choose to override the validation
   - Non-admin users are prevented from creating conflicting bookings

## Database Schema

The validation works with the existing `job_cards` table schema:

```sql
create table public.job_cards (
  id uuid not null default gen_random_uuid (),
  job_number character varying(50) not null,
  job_date timestamp with time zone null default now(),
  -- Other fields omitted for brevity
  technician_name character varying(255) null,
  start_time timestamp with time zone null,
  end_time timestamp with time zone null,
  status character varying(20) null default 'pending'::character varying,
  -- More fields...
)
```

## Usage Example

### Checking Availability

```typescript
import { useTechnicianAvailability } from '@/hooks/useTechnicianAvailability';

function TechnicianScheduler() {
  const {
    checkAvailability,
    isLoading,
    hasConflicts,
    conflicts
  } = useTechnicianAvailability();
  
  const handleDateSelection = async (date, technician) => {
    const result = await checkAvailability(technician, date, '09:00');
    
    if (result.hasConflicts) {
      // Show warning to user
    }
  };
}
```

### Assigning with Override

```typescript
import { useTechnicianAvailability } from '@/hooks/useTechnicianAvailability';

function AssignTechnicianForm() {
  const { assignTechnician } = useTechnicianAvailability();
  
  const handleAssign = async (jobId, technician, date) => {
    const result = await assignTechnician(jobId, technician, date);
    
    if (!result.success && result.needsOverride) {
      // Show override prompt
      if (confirmOverride()) {
        // Try again with override flag
        await assignTechnician(jobId, technician, date, '09:00', true);
      }
    }
  };
}
```

## Best Practices

1. Always check availability before attempting to assign a technician
2. Provide clear warnings to users when conflicts are detected
3. Limit override capabilities to administrators
4. Keep logs of overridden conflicts for auditing
5. Use the provided hooks and functions instead of direct database access