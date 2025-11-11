-- Show what would be affected before undoing
SELECT 
  'Would clear these codes' as action,
  new_account_number,
  company,
  COUNT(*) as vehicle_count
FROM vehicles 
WHERE new_account_number IS NOT NULL
  AND created_at >= NOW() - INTERVAL '2 hours'  -- Only recent changes
GROUP BY new_account_number, company
ORDER BY vehicle_count DESC;

-- If you want to proceed, uncomment below:
-- UPDATE vehicles 
-- SET new_account_number = NULL
-- WHERE created_at >= NOW() - INTERVAL '2 hours'
--   AND new_account_number IS NOT NULL;