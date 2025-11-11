-- Insert unique account numbers from vehicles to cost_centers table
INSERT INTO cost_centers (cost_code, company)
SELECT DISTINCT 
  v.new_account_number,
  v.company
FROM vehicles v
WHERE v.new_account_number IS NOT NULL 
  AND v.new_account_number != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM cost_centers cc 
    WHERE cc.cost_code = v.new_account_number
  );

-- Show results
SELECT 
  'Inserted cost centers' as action,
  COUNT(*) as count
FROM cost_centers cc
WHERE cc.created_at >= NOW() - INTERVAL '1 minute';