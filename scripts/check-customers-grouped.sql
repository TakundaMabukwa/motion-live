-- Check if customers_grouped table is empty
SELECT 
  COUNT(*) as total_rows,
  COUNT(all_new_account_numbers) as rows_with_accounts
FROM customers_grouped;

-- Show sample data if exists
SELECT * FROM customers_grouped LIMIT 5;