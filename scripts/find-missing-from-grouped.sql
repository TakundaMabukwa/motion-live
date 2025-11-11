-- Find account numbers from customers_grouped that are missing in cost_centers
WITH split_accounts AS (
  SELECT 
    cg.company_group,
    TRIM(unnest(string_to_array(cg.all_new_account_numbers, ','))) as account_number
  FROM customers_grouped cg
  WHERE cg.all_new_account_numbers IS NOT NULL 
    AND cg.all_new_account_numbers != ''
),
missing_accounts AS (
  SELECT DISTINCT
    sa.account_number,
    sa.company_group
  FROM split_accounts sa
  WHERE sa.account_number != ''
    AND NOT EXISTS (
      SELECT 1 
      FROM cost_centers cc 
      WHERE cc.cost_code = sa.account_number
    )
)
SELECT 
  account_number,
  company_group,
  COUNT(*) OVER() as total_missing
FROM missing_accounts
ORDER BY company_group, account_number;

-- Insert missing ones into cost_centers
INSERT INTO cost_centers (cost_code, company)
SELECT DISTINCT
  ma.account_number,
  ma.company_group
FROM (
  SELECT 
    TRIM(unnest(string_to_array(cg.all_new_account_numbers, ','))) as account_number,
    cg.company_group
  FROM customers_grouped cg
  WHERE cg.all_new_account_numbers IS NOT NULL 
    AND cg.all_new_account_numbers != ''
) ma
WHERE ma.account_number != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM cost_centers cc 
    WHERE cc.cost_code = ma.account_number
  );