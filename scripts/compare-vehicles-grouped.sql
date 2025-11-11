-- Show only vehicles that DON'T have matches in customers_grouped
SELECT 
  v.new_account_number as vehicle_account,
  v.company as vehicle_company,
  COUNT(*) as vehicle_count
FROM vehicles v
WHERE v.new_account_number IS NOT NULL 
  AND v.new_account_number != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM customers_grouped cg 
    WHERE cg.all_new_account_numbers LIKE '%' || v.new_account_number || '%'
  )
GROUP BY v.new_account_number, v.company
ORDER BY v.new_account_number;