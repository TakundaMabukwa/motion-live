-- Step 1: Update vehicles with missing cost codes (same company = same code)
WITH unique_companies AS (
  SELECT DISTINCT
    company,
    UPPER(LEFT(REPLACE(company, ' ', ''), 4)) as prefix
  FROM vehicles 
  WHERE (new_account_number IS NULL OR new_account_number = '') 
    AND company IS NOT NULL 
    AND company != ''
),
existing_codes AS (
  SELECT cost_code FROM cost_centers
  UNION
  SELECT new_account_number FROM vehicles WHERE new_account_number IS NOT NULL AND new_account_number != ''
),
company_cost_codes AS (
  SELECT 
    uc.company,
    uc.prefix,
    uc.prefix || '-' || LPAD(
      (
        SELECT COALESCE(MAX(CAST(SUBSTRING(ec.cost_code FROM LENGTH(uc.prefix) + 2) AS INTEGER)), 0) + 
               ROW_NUMBER() OVER (ORDER BY uc.company)
        FROM existing_codes ec 
        WHERE ec.cost_code LIKE uc.prefix || '-%'
      )::text, 
      4, 
      '0'
    ) as cost_code
  FROM unique_companies uc
)
UPDATE vehicles 
SET new_account_number = ccc.cost_code
FROM company_cost_codes ccc
WHERE vehicles.company = ccc.company
  AND (vehicles.new_account_number IS NULL OR vehicles.new_account_number = '');

-- Step 2: Insert new cost centers
INSERT INTO cost_centers (cost_code, company)
SELECT DISTINCT 
  v.new_account_number,
  v.company
FROM vehicles v
WHERE v.new_account_number IS NOT NULL 
  AND v.new_account_number != ''
  AND NOT EXISTS (
    SELECT 1 FROM cost_centers cc 
    WHERE cc.cost_code = v.new_account_number
  );

-- Step 3: Show results
SELECT 
  'Vehicles with cost codes' as action,
  COUNT(*) as count
FROM vehicles 
WHERE new_account_number IS NOT NULL 
  AND new_account_number != ''

UNION ALL

SELECT 
  'Total cost centers' as action,
  COUNT(*) as count
FROM cost_centers;