-- =====================================================
-- SUPABASE CRON JOB SETUP FOR MONTHLY BILLING
-- =====================================================
-- This script sets up the scheduled job to run monthly billing
-- on the 21st of every month

-- =====================================================
-- 1. ENABLE PG_CRON EXTENSION
-- =====================================================

-- Enable the pg_cron extension (if not already enabled)
-- This needs to be done by a superuser in Supabase dashboard
-- or by running: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 2. REMOVE EXISTING JOBS FIRST
-- =====================================================

-- Remove existing jobs if they exist to avoid conflicts
SELECT cron.unschedule('monthly-billing-process') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'monthly-billing-process'
);

SELECT cron.unschedule('daily-overdue-update') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'daily-overdue-update'
);

-- =====================================================
-- 3. CREATE SCHEDULED JOB FOR MONTHLY BILLING
-- =====================================================

-- Schedule the monthly billing process to run on the 21st of every month at 9:00 AM
-- The cron expression '0 9 21 * *' means:
-- - 0 minutes
-- - 9 hours (9 AM)
-- - 21st day of month
-- - * any month
-- - * any day of week

SELECT cron.schedule(
    'monthly-billing-process'::text,
    '0 9 21 * *'::text,  -- Run on 21st of every month at 9:00 AM
    'SELECT monthly_billing_process();'::text
);

-- =====================================================
-- 4. CREATE DAILY OVERDUE UPDATE JOB
-- =====================================================

-- Schedule daily update of overdue amounts at 8:00 AM
SELECT cron.schedule(
    'daily-overdue-update'::text,
    '0 8 * * *'::text,  -- Run daily at 8:00 AM
    'SELECT update_overdue_amounts();'::text
);

-- =====================================================
-- 4. VIEW SCHEDULED JOBS
-- =====================================================

-- To view all scheduled jobs, run:
-- SELECT * FROM cron.job;

-- To view job run history, run:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC;

-- =====================================================
-- 5. MANAGE JOBS (OPTIONAL COMMANDS)
-- =====================================================

-- To unschedule a job:
-- SELECT cron.unschedule('monthly-billing-process'::text);
-- SELECT cron.unschedule('daily-overdue-update'::text);

-- To reschedule a job:
-- SELECT cron.unschedule('monthly-billing-process'::text);
-- SELECT cron.schedule(
--     'monthly-billing-process'::text,
--     '0 9 21 * *'::text,
--     'SELECT monthly_billing_process();'::text
-- );

-- =====================================================
-- 6. TEST THE SETUP
-- =====================================================

-- Test the monthly billing function manually:
-- SELECT trigger_monthly_billing();

-- Test the overdue update function:
-- SELECT update_overdue_amounts();

-- View the payments dashboard:
-- SELECT * FROM payments_dashboard LIMIT 10;

-- =====================================================
-- NOTES FOR SUPABASE SETUP
-- =====================================================

/*
IMPORTANT SETUP STEPS:

1. In Supabase Dashboard:
   - Go to Database > Extensions
   - Enable "pg_cron" extension
   - This requires superuser privileges

2. Run the main database_payments_setup.sql script first

3. Then run this cron setup script

4. Verify the jobs are scheduled:
   SELECT * FROM cron.job;

5. Monitor job execution:
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC;

6. Test manually:
   SELECT trigger_monthly_billing();
*/

COMMENT ON FUNCTION cron.schedule IS 'Schedules monthly billing on 21st of each month at 9 AM';
COMMENT ON FUNCTION cron.unschedule IS 'Removes scheduled jobs';
