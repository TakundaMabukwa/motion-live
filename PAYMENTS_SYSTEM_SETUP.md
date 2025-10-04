# 💳 Payments System Setup Guide

## 📋 Overview

This guide sets up a comprehensive payments system that:
- Tracks payments by cost code
- Monitors overdue payments (30, 60, 90 days)
- Automatically calculates monthly billing from vehicle `total_rental_sub` amounts
- Runs scheduled billing on the 21st of every month

## 🗄️ Database Structure

### **Payments Table (`payments_`)**
```sql
- id (UUID, Primary Key)
- created_at (Timestamp)
- company (Text)
- cost_code (Text) - Links to vehicles.new_account_number
- due_amount (Numeric) - Total amount due
- paid_amount (Numeric) - Amount paid
- balance_due (Numeric) - Remaining balance
- invoice_date (Date)
- due_date (Date)
- payment_status (Text) - pending/paid/overdue/partial
- overdue_30_days (Numeric)
- overdue_60_days (Numeric)
- overdue_90_days (Numeric)
- last_updated (Timestamp)
- billing_month (Date)
```

## 🚀 Setup Instructions

### **Step 1: Run Database Setup**
Execute the main database setup script:
```sql
-- Run this in Supabase SQL Editor
\i database_payments_setup.sql
```

### **Step 2: Enable pg_cron Extension**
In Supabase Dashboard:
1. Go to **Database** → **Extensions**
2. Search for **pg_cron**
3. Click **Enable** (requires superuser privileges)

### **Step 3: Setup Scheduled Jobs**
Execute the cron setup script:
```sql
-- Run this in Supabase SQL Editor
\i supabase_cron_setup.sql
```

### **Step 4: Verify Setup**
```sql
-- Check scheduled jobs
SELECT * FROM cron.job;

-- Test monthly billing manually
SELECT trigger_monthly_billing();

-- View payments dashboard
SELECT * FROM payments_dashboard LIMIT 10;
```

## 🔧 Key Functions

### **1. Monthly Billing Calculation**
```sql
-- Manually trigger monthly billing
SELECT trigger_monthly_billing();

-- Function aggregates total_rental_sub from vehicles table
-- Groups by cost_code (new_account_number)
-- Creates/updates payment records
```

### **2. Overdue Tracking**
```sql
-- Update overdue amounts
SELECT update_overdue_amounts();

-- Automatically categorizes payments into:
-- - overdue_30_days
-- - overdue_60_days  
-- - overdue_90_days
```

### **3. Payments Summary**
```sql
-- Get comprehensive payments summary
SELECT * FROM get_payments_summary();

-- Returns aggregated data by cost_code
```

## 📊 Scheduled Jobs

### **Monthly Billing (21st of each month)**
- **Schedule**: `0 9 21 * *` (9:00 AM on 21st)
- **Function**: `monthly_billing_process()`
- **Action**: Calculates billing from vehicles table

### **Daily Overdue Update**
- **Schedule**: `0 8 * * *` (8:00 AM daily)
- **Function**: `update_overdue_amounts()`
- **Action**: Updates overdue categories

## 🎯 How It Works

### **Monthly Billing Process**
1. **Aggregation**: Sums `total_rental_sub` from vehicles table
2. **Grouping**: Groups by `new_account_number` (cost_code)
3. **Creation**: Creates/updates payment records in `payments_` table
4. **Due Dates**: Sets due date to 30 days from invoice date
5. **Status**: Updates payment status based on due dates

### **Overdue Tracking**
1. **30 Days**: Payments overdue 30-59 days
2. **60 Days**: Payments overdue 60-89 days  
3. **90 Days**: Payments overdue 90+ days
4. **Status Update**: Automatically updates payment_status

### **Data Flow**
```
Vehicles Table (total_rental_sub) 
    ↓ (Monthly Aggregation)
Payments Table (due_amount)
    ↓ (Daily Overdue Check)
Overdue Categories (30/60/90 days)
```

## 📈 Usage Examples

### **View Payments Dashboard**
```sql
SELECT 
    cost_code,
    company,
    total_due,
    balance_due,
    overdue_30_days,
    overdue_60_days,
    overdue_90_days,
    payment_status
FROM payments_dashboard
ORDER BY balance_due DESC;
```

### **Get Overdue Summary**
```sql
SELECT 
    SUM(overdue_30_days) as total_30_day_overdue,
    SUM(overdue_60_days) as total_60_day_overdue,
    SUM(overdue_90_days) as total_90_day_overdue
FROM payments_dashboard;
```

### **Manual Payment Entry**
```sql
-- Update payment amount
UPDATE payments_ 
SET paid_amount = 1000.00
WHERE cost_code = 'AVIS-0001' 
AND billing_month = '2024-01-01';

-- Balance and status will auto-update via trigger
```

## 🔍 Monitoring

### **Check Job Status**
```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- View job execution history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### **Billing Log**
```sql
-- View billing process logs
SELECT * FROM billing_log 
ORDER BY created_at DESC;
```

## ⚠️ Important Notes

1. **Superuser Required**: pg_cron extension requires superuser privileges
2. **Monthly Schedule**: Billing runs on 21st of each month at 9:00 AM
3. **Data Source**: Uses `total_rental_sub` from vehicles table
4. **Cost Code Matching**: Links vehicles via `new_account_number` field
5. **Automatic Updates**: Balance and status update automatically via triggers

## 🛠️ Troubleshooting

### **Jobs Not Running**
```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check job status
SELECT * FROM cron.job;

-- Check recent runs
SELECT * FROM cron.job_run_details 
WHERE jobname = 'monthly-billing-process'
ORDER BY start_time DESC;
```

### **Manual Testing**
```sql
-- Test billing calculation
SELECT trigger_monthly_billing();

-- Test overdue update
SELECT update_overdue_amounts();

-- Check results
SELECT * FROM payments_dashboard LIMIT 5;
```

## 📋 Next Steps

After database setup:
1. **Create Frontend**: Build payments dashboard UI
2. **API Endpoints**: Create REST endpoints for payments data
3. **Reporting**: Add payment reports and analytics
4. **Notifications**: Set up overdue payment alerts
5. **Integration**: Connect with accounting systems

The payments system is now ready for integration with your application! 🎉
