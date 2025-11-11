-- Find companies with multiple different cost codes
SELECT 
  company,
  COUNT(DISTINCT new_account_number) as different_codes,
  STRING_AGG(DISTINCT new_account_number, ', ') as all_codes,
  COUNT(*) as total_vehicles
FROM vehicles 
WHERE company IS NOT NULL 
  AND company != ''
  AND new_account_number IS NOT NULL 
  AND new_account_number != ''
GROUP BY company
HAVING COUNT(DISTINCT new_account_number) > 1
ORDER BY different_codes DESC;

-- Fix: Update all vehicles of same company to use the lowest cost code
WITH company_min_codes AS (
  SELECT 
    company,
    MIN(new_account_number) as min_code
  FROM vehicles 
  WHERE company IS NOT NULL 
    AND company != ''
    AND new_account_number IS NOT NULL 
    AND new_account_number != ''
  GROUP BY company
  HAVING COUNT(DISTINCT new_account_number) > 1
)
UPDATE vehicles 
SET new_account_number = cmc.min_code
FROM company_min_codes cmc
WHERE vehicles.company = cmc.company
  AND vehicles.new_account_number != cmc.min_code;

-- Show results
SELECT 
  'Fixed companies' as action,
  COUNT(*) as count
FROM (
  SELECT company
  FROM vehicles 
  WHERE company IS NOT NULL 
    AND new_account_number IS NOT NULL
  GROUP BY company
  HAVING COUNT(DISTINCT new_account_number) = 1
) fixed;