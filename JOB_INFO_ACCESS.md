# Job Information Access Guide

This document explains how to access all job information in the technician system.

## Available Endpoints

### 1. Standard Job List
**URL:** `/api/technicians/jobs`
**Method:** GET
**Description:** Returns basic job information for the authenticated user

**Response:**
```json
{
  "jobs": [...],
  "userRole": "technician" | "tech_admin",
  "userEmail": "user@example.com"
}
```

### 2. Detailed Job Information
**URL:** `/api/technicians/jobs?detailed=true`
**URL:** `/api/technicians/jobs?format=json`
**Method:** GET
**Description:** Returns comprehensive job information with field descriptions

**Response:**
```json
{
  "jobs": [...],
  "userRole": "technician" | "tech_admin",
  "userEmail": "user@example.com",
  "totalJobs": 25,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "fields": {
    "basic": ["id", "job_number", "job_type", "status", "job_status", "priority", "job_description"],
    "customer": ["customer_name", "customer_email", "customer_phone", "customer_address", "job_location"],
    "vehicle": ["vehicle_registration", "vehicle_make", "vehicle_model", "vin_numer", "vehicle_year"],
    "financial": ["estimated_cost", "quotation_total_amount", "actual_cost", "quotation_subtotal"],
    "timeline": ["created_at", "due_date", "start_time", "completion_date", "updated_at"],
    "technical": ["technician_name", "technician_phone", "ip_address", "qr_code", "special_instructions"],
    "additional": ["before_photos", "after_photos", "products_required", "parts_required", "equipment_used"]
  }
}
```

### 3. Individual Job Details
**URL:** `/api/job-cards/[id]`
**Method:** GET
**Description:** Returns detailed information for a specific job

## Complete Job Fields Available

### Basic Information
- `id` - Unique job identifier (UUID)
- `job_number` - Human-readable job number
- `job_type` - Type of job (e.g., "Installation", "Repair", "Maintenance")
- `status` - Current job status
- `job_status` - Alternative status field
- `priority` - Job priority level
- `job_description` - Detailed job description

### Customer Information
- `customer_name` - Customer's full name
- `customer_email` - Customer's email address
- `customer_phone` - Customer's phone number
- `customer_address` - Customer's address
- `job_location` - Job location/address

### Vehicle Information
- `vehicle_registration` - Vehicle registration number
- `vehicle_make` - Vehicle manufacturer
- `vehicle_model` - Vehicle model
- `vin_numer` - Vehicle Identification Number
- `vehicle_year` - Vehicle manufacturing year

### Financial Information
- `estimated_cost` - Estimated job cost
- `quotation_total_amount` - Total quotation amount
- `actual_cost` - Actual job cost
- `quotation_subtotal` - Quotation subtotal
- `quotation_vat_amount` - VAT amount

### Timeline Information
- `created_at` - Job creation timestamp
- `due_date` - Job due date
- `start_time` - Job start timestamp
- `completion_date` - Job completion timestamp
- `updated_at` - Last update timestamp

### Technical Information
- `technician_name` - Assigned technician name
- `technician_phone` - Technician phone/email
- `ip_address` - IP address for the job
- `qr_code` - QR code for job verification
- `special_instructions` - Special instructions for the job

### Additional Information
- `before_photos` - Photos taken before job (JSONB)
- `after_photos` - Photos taken after job (JSONB)
- `products_required` - Required products (JSONB)
- `parts_required` - Required parts (JSONB)
- `equipment_used` - Equipment used (JSONB)

## Access Control

- **Tech Admin:** Can view all jobs in the system
- **Technician:** Can only view jobs where their email matches `technician_phone` field

## Usage Examples

### Get All Jobs (Basic)
```javascript
const response = await fetch('/api/technicians/jobs');
const data = await response.json();
console.log(`Found ${data.jobs.length} jobs`);
```

### Get All Jobs (Detailed)
```javascript
const response = await fetch('/api/technicians/jobs?detailed=true');
const data = await response.json();
console.log(`Total jobs: ${data.totalJobs}`);
console.log('Available fields:', data.fields);
```

### Get Specific Job
```javascript
const jobId = 'uuid-here';
const response = await fetch(`/api/job-cards/${jobId}`);
const job = await response.json();
console.log('Job details:', job);
```

### Filter Jobs by Status
```javascript
const response = await fetch('/api/technicians/jobs');
const data = await response.json();
const activeJobs = data.jobs.filter(job => 
  job.status === 'Active' || job.job_status === 'Active'
);
console.log(`Active jobs: ${activeJobs.length}`);
```

### Get Jobs with Vehicle Information
```javascript
const response = await fetch('/api/technicians/jobs');
const data = await response.json();
const jobsWithVehicles = data.jobs.filter(job => 
  job.vehicle_registration || job.vin_numer
);
console.log(`Jobs with vehicle info: ${jobsWithVehicles.length}`);
```

## UI Access

The system also provides a comprehensive UI to view all job information:

1. **Dashboard View:** Click "View All Job Info" button to see all jobs in a table format
2. **Individual Job View:** Click "Details" button on any job to see comprehensive information
3. **Calendar View:** Jobs are displayed in calendar format with additional details

## Notes

- All timestamps are in ISO 8601 format
- JSONB fields contain structured data that can be parsed
- Empty or null fields are displayed as "N/A" in the UI
- The system automatically handles authentication and authorization
- Job data is real-time and reflects the current state in the database
