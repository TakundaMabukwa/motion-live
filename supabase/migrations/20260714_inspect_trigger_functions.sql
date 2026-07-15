-- Inspect all trigger functions on job_cards to find the FOR loop bug
SELECT p.proname AS function_name,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'calculate_job_duration',
    'validate_technician_booking',
    'generate_technician_email',
    'manage_tech_stock_assignment',
    'update_job_cards_updated_at',
    'log_job_cards_stock_movement',
    'log_tech_stock_movement',
    'sync_job_card_accounts',
    'set_job_number',
    'set_quotation_number'
  )
ORDER BY p.proname;
