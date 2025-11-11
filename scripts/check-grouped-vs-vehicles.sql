-- Find account numbers from customers_grouped that are NOT in vehicles table
WITH split_accounts AS (
  SELECT 
    cg.company_group,
    TRIM(unnest(string_to_array(cg.all_new_account_numbers, ','))) as account_number
  FROM customers_grouped cg
  WHERE cg.all_new_account_numbers IS NOT NULL 
    AND cg.all_new_account_numbers != ''
),
missing_in_vehicles AS (
  SELECT DISTINCT
    sa.account_number,
    sa.company_group
  FROM split_accounts sa
  WHERE sa.account_number != ''
    AND NOT EXISTS (
      SELECT 1 
      FROM vehicles v 
      WHERE v.new_account_number = sa.account_number
    )
)
SELECT 
  account_number,
  company_group,
  'Missing in vehicles table' as status,
  COUNT(*) OVER() as total_missing
FROM missing_in_vehicles
ORDER BY company_group, account_number;