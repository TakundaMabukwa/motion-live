-- Undo recent cost code changes

-- Step 1: Remove cost centers created in the last hour
DELETE FROM cost_centers 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Step 2: Clear new_account_number for vehicles that got auto-generated codes
-- (assuming auto-generated codes follow pattern: 4 letters + dash + 4 digits)
UPDATE vehicles 
SET new_account_number = NULL
WHERE new_account_number ~ '^[A-Z]{4}-[0-9]{4}$'
  AND created_at >= NOW() - INTERVAL '1 hour';

-- Step 3: Show what was undone
SELECT 
  'Removed cost centers' as action,
  COUNT(*) as count
FROM cost_centers 
WHERE created_at < NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Cleared vehicle codes' as action,
  COUNT(*) as count
FROM vehicles 
WHERE new_account_number IS NULL;