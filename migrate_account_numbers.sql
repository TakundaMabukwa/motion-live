-- Script to migrate unique account numbers from vehicles table to cost_centers table
INSERT INTO public.cost_centers (company, cost_code)
SELECT DISTINCT 
    company,
    new_account_number
FROM public.vehicles 
WHERE new_account_number IS NOT NULL 
    AND new_account_number != ''
    AND NOT EXISTS (
        SELECT 1 
        FROM public.cost_centers cc 
        WHERE cc.cost_code = vehicles.new_account_number
    );