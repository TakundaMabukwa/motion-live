-- Count vehicles without new_account_number
SELECT 
  COUNT(*) as vehicles_without_cost_codes,
  COUNT(DISTINCT company) as unique_companies
FROM vehicles 
WHERE (new_account_number IS NULL OR new_account_number = '')
  AND company IS NOT NULL 
  AND company != '';

-- Show breakdown by company
SELECT 
  company,
  COUNT(*) as vehicle_count
FROM vehicles 
WHERE (new_account_number IS NULL OR new_account_number = '')
  AND company IS NOT NULL 
  AND company != ''
GROUP BY company
ORDER BY vehicle_count DESC;