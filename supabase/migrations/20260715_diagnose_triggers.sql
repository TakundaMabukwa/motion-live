-- DIAGNOSTIC: Find ALL trigger functions on job_cards and their definitions
-- Run this in Supabase SQL Editor and share the results

SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.action_timing,
  t.action_statement,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS full_function_definition
FROM information_schema.triggers t
JOIN pg_proc p ON p.proname = t.action_statement
WHERE t.event_object_table = 'job_cards'
ORDER BY t.trigger_name;
