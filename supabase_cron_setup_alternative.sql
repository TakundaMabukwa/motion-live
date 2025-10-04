-- =====================================================
-- ALTERNATIVE SUPABASE CRON SETUP (More Robust)
-- =====================================================
-- This script handles the "function name not unique" error
-- by being more explicit about function signatures

-- =====================================================
-- 1. FIRST, CHECK EXISTING JOBS AND CLEAN UP
-- =====================================================

-- View existing jobs
SELECT * FROM cron.job;

-- Remove ALL existing jobs with our names (if they exist)
DO $$
BEGIN
    -- Unschedule monthly billing job
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-billing-process') THEN
        PERFORM cron.unschedule('monthly-billing-process');
        RAISE NOTICE 'Removed existing monthly-billing-process job';
    END IF;
    
    -- Unschedule daily overdue update job
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-overdue-update') THEN
        PERFORM cron.unschedule('daily-overdue-update');
        RAISE NOTICE 'Removed existing daily-overdue-update job';
    END IF;
END $$;

-- =====================================================
-- 2. CREATE JOBS WITH EXPLICIT FUNCTION CALLS
-- =====================================================

-- Create monthly billing job using DO block
DO $$
DECLARE
    job_id bigint;
BEGIN
    -- Schedule monthly billing (21st of every month at 9:00 AM)
    SELECT cron.schedule(
        'monthly-billing-process',    -- job name
        '0 9 21 * *',               -- cron schedule
        'SELECT monthly_billing_process();'  -- SQL command
    ) INTO job_id;
    
    RAISE NOTICE 'Created monthly billing job with ID: %', job_id;
END $$;

-- Create daily overdue update job using DO block
DO $$
DECLARE
    job_id bigint;
BEGIN
    -- Schedule daily overdue update (every day other than the 21st at 8:00 AM)
    SELECT cron.schedule(
        'daily-overdue-update',      -- job name
        '0 8 1-20,22-31 * *',       -- cron schedule (1-20 and 22-31 of month)
        'SELECT update_overdue_amounts();'  -- SQL command
    ) INTO job_id;
    
    RAISE NOTICE 'Created daily overdue update job with ID: %', job_id;
END $$;

-- =====================================================
-- 3. VERIFY JOBS WERE CREATED
-- =====================================================

-- Show all scheduled jobs
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job 
ORDER BY jobid;

-- =====================================================
-- 4. TEST FUNCTIONS MANUALLY
-- =====================================================

-- Test monthly billing function
SELECT 'Testing monthly billing...' as status;
SELECT trigger_monthly_billing() as result;

-- Test overdue update function  
SELECT 'Testing overdue updates...' as status;
SELECT update_overdue_amounts() as result;

-- =====================================================
-- 5. MONITORING SETUP
-- =====================================================

-- Create a view to monitor upcoming job executions
CREATE OR REPLACE VIEW cron_job_schedule_help AS
SELECT 
    jobname,
    schedule,
    command,
    CASE 
        WHEN schedule LIKE '% 21 %' THEN 'Monthly billing (21st)'
        WHEN schedule LIKE '% 8 %' THEN 'Daily overdue update (8 AM)'
        ELSE 'Other scheduled job'
    END as description,
    active
FROM cron.job;

-- View the job schedule help
SELECT * FROM cron_job_schedule_help;

-- =====================================================
-- 6. ALTERNATIVE MANUAL SCHEDULING (If cron.schedule still fails)
-- =====================================================

-- If the above still fails, you can manually schedule using:
-- 
-- Monthly billing (run this manually on 21st of each month):
-- SELECT trigger_monthly_billing();
--
-- Daily overdue updates (run this manually each day):
-- SELECT update_overdue_amounts();

COMMENT ON VIEW cron_job_schedule_help IS 'Helper view to understand scheduled job schedules';
