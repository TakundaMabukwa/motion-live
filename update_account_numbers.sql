-- Update new_account_number in vehicles table based on company name match with cost_centers
UPDATE public.vehicles v
SET new_account_number = cc.cost_code
FROM public.cost_centers cc
WHERE TRIM(v.company) = TRIM(cc.company)
  AND (v.new_account_number IS NULL OR v.new_account_number = '' OR v.new_account_number != cc.cost_code);
