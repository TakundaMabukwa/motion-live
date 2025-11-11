-- Script to ensure all new_account_numbers from vehicles table exist in cost_centers table
-- Insert missing cost codes with their company information

INSERT INTO cost_centers (cost_code, company, created_at)
SELECT DISTINCT 
    v.new_account_number as cost_code,
    v.company,
    NOW() as created_at
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
    'Inserted' as action,
    COUNT(*) as count
FROM cost_centers cc
WHERE cc.created_at >= NOW() - INTERVAL '1 minute';

-- Verify all vehicles have corresponding cost centers
SELECT 
    COUNT(DISTINCT v.new_account_number) as unique_vehicle_accounts,
    COUNT(DISTINCT cc.cost_code) as unique_cost_centers,
    CASE 
        WHEN COUNT(DISTINCT v.new_account_number) = COUNT(DISTINCT cc.cost_code) 
        THEN 'SYNCED' 
        ELSE 'MISMATCH' 
    END as status
FROM vehicles v
LEFT JOIN cost_centers cc ON v.new_account_number = cc.cost_code
WHERE v.new_account_number IS NOT NULL AND v.new_account_number != '';