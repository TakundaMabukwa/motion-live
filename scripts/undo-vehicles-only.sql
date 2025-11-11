-- Undo only vehicles table changes (clear auto-generated cost codes)
UPDATE vehicles 
SET new_account_number = NULL
WHERE new_account_number ~ '^[A-Z]{4}-[0-9]{4}$';

-- Show what was cleared
SELECT 
  'Cleared vehicle codes' as action,
  COUNT(*) as count
FROM vehicles 
WHERE new_account_number IS NULL;