# Vehicle Inventory Integration

## Overview

This implementation automatically adds vehicles to the inventory system (`vehicles_ip` and `vehicle_invoices` tables) when a job card is completed by a technician. This ensures that all completed vehicles are properly tracked in the inventory and billing systems.

## Features

- **Automatic Vehicle Addition**: Vehicles are automatically added to inventory when jobs are completed
- **Dual Table Integration**: Vehicles are added to both `vehicles_ip` and `vehicle_invoices` tables
- **Manual Override**: Technicians can manually add vehicles to inventory if needed
- **Status Tracking**: Tracks whether vehicles have been added to inventory
- **Error Handling**: Comprehensive error handling with detailed logging

## Database Changes

### 1. Job Cards Table Updates

Run the SQL script to add vehicle inventory tracking fields:

```sql
-- Run this in your Supabase SQL Editor
-- File: add_vehicle_inventory_fields.sql
```

This adds:
- `vehicle_added_to_inventory` (boolean) - Tracks if vehicle was added to inventory
- `vehicle_added_at` (timestamp) - When the vehicle was added to inventory

## Implementation Details

### Files Created/Modified

1. **`app/api/job-cards/[id]/add-vehicle/route.ts`** - API endpoint for adding vehicles to inventory
2. **`app/api/job-cards/[id]/route.ts`** - Updated job completion logic
3. **`app/protected/tech/job/page.tsx`** - Updated technician interface with manual add button
4. **`add_vehicle_inventory_fields.sql`** - Database migration script

### API Endpoints

#### POST `/api/job-cards/[id]/add-vehicle`

Manually adds a vehicle to inventory for a completed job.

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicle successfully added to inventory",
  "results": {
    "vehicles_ip": { /* vehicles_ip record */ },
    "vehicle_invoices": { /* vehicle_invoices record */ },
    "errors": []
  }
}
```

### Flow

1. **Job Completion**: Technician completes a job card
2. **Automatic Addition**: System automatically adds vehicle to inventory
3. **Dual Table Update**: Vehicle is added to both `vehicles_ip` and `vehicle_invoices` tables
4. **Status Update**: Job card is marked with `vehicle_added_to_inventory = true`
5. **Manual Override**: If automatic addition fails, technician can manually add vehicle

## Data Mapping

### Vehicles_IP Table

| Field | Source | Description |
|-------|--------|-------------|
| `new_account_number` | `job_card.account_id` or `JOB-{job_number}` | Account identifier |
| `company` | `job_card.customer_name` | Customer/company name |
| `comment` | `"Added from completed job: {job_number}"` | Description |
| `group_name` | `job_card.customer_name` | Group name |
| `new_registration` | `job_card.vehicle_registration` | Vehicle registration |
| `beame_1` | `job_card.vehicle_make` | Vehicle make |
| `beame_2` | `job_card.vehicle_model` | Vehicle model |
| `beame_3` | `job_card.vehicle_year` | Vehicle year |
| `products` | `job_card.products_required` | Products used |
| `active` | `true` | Always active |

### Vehicle_Invoices Table

| Field | Source | Description |
|-------|--------|-------------|
| `new_account_number` | `job_card.account_id` or `JOB-{job_number}` | Account identifier |
| `company` | `job_card.customer_name` | Customer/company name |
| `group_name` | `job_card.customer_name` | Group name |
| `stock_code` | `VEH-{registration}` or `VEH-{job_number}` | Stock code |
| `stock_description` | `"{make} {model} {year}"` | Vehicle description |
| `doc_no` | `INV-{job_number}` | Invoice number |
| `total_ex_vat` | `job_card.actual_cost` | Cost excluding VAT |
| `total_vat` | `actual_cost * 0.15` | 15% VAT |
| `total_incl_vat` | `actual_cost * 1.15` | Total including VAT |
| `one_month` | `job_card.actual_cost` | Monthly amount |
| `amount_due` | `actual_cost * 1.15` | Amount due |

## User Interface

### Technician Dashboard

- **Automatic Addition**: When completing a job, vehicles are automatically added to inventory
- **Manual Button**: "Add to Inventory" button appears for completed jobs that haven't been added yet
- **Status Indicators**: Visual indicators show if vehicles have been added to inventory
- **Success Messages**: Toast notifications confirm successful operations

### Button States

- **Completed Jobs**: Show "Add to Inventory" button if not already added
- **Already Added**: No button shown (vehicle already in inventory)
- **In Progress**: Show "Complete Job" button

## Error Handling

### Automatic Addition

- If automatic addition fails, job completion still succeeds
- Errors are logged for debugging
- Manual addition option remains available

### Manual Addition

- Detailed error messages for troubleshooting
- Validation ensures job is completed before adding
- Prevents duplicate additions

## Testing

### Test Scenarios

1. **Complete a job** → Vehicle automatically added to inventory
2. **Manual addition** → Click "Add to Inventory" button
3. **Duplicate prevention** → Cannot add same vehicle twice
4. **Error handling** → Graceful handling of database errors

### Database Verification

```sql
-- Check if vehicles were added to inventory
SELECT * FROM vehicles_ip WHERE comment LIKE 'Added from completed job:%';

-- Check if invoices were created
SELECT * FROM vehicle_invoices WHERE doc_no LIKE 'INV-%';

-- Check job card status
SELECT job_number, job_status, vehicle_added_to_inventory, vehicle_added_at 
FROM job_cards 
WHERE job_status = 'Completed';
```

## Troubleshooting

### Common Issues

1. **Vehicle not added automatically**:
   - Check if job status is 'Completed'
   - Verify database migration was run
   - Check server logs for errors

2. **Manual addition fails**:
   - Ensure job is completed
   - Check if vehicle already added
   - Verify database permissions

3. **Missing data in inventory**:
   - Check job card has required vehicle information
   - Verify account_id is set
   - Check customer_name is populated

### Debug Queries

```sql
-- Check job completion status
SELECT id, job_number, job_status, vehicle_added_to_inventory, vehicle_added_at
FROM job_cards 
WHERE id = 'your-job-id';

-- Check vehicles_ip entries
SELECT * FROM vehicles_ip 
WHERE new_account_number = 'your-account-number';

-- Check vehicle_invoices entries
SELECT * FROM vehicle_invoices 
WHERE new_account_number = 'your-account-number';
```

## Future Enhancements

- **Bulk Operations**: Add multiple vehicles at once
- **Inventory Validation**: Validate vehicle data before adding
- **Custom Fields**: Allow custom field mapping
- **Integration Testing**: Automated tests for the workflow
- **Audit Trail**: Track all inventory additions and modifications
