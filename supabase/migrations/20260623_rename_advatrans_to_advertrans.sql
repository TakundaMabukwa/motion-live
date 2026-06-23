-- 1. Rename column
ALTER TABLE vehicles_duplicate
  RENAME COLUMN advatrans_software_development TO advertrans_software_development;

-- 2. Fix company name data in vehicles_duplicate
UPDATE vehicles_duplicate
SET company = REPLACE(company, 'ADVATRANS', 'ADVERTRANS')
WHERE company ILIKE '%advatrans%';

-- 3. Fix company name data in cost_centers
UPDATE cost_centers
SET company = REPLACE(company, 'ADVATRANS', 'ADVERTRANS')
WHERE company ILIKE '%advatrans%';

-- 4. Fix trading_name in cost_centers
UPDATE cost_centers
SET trading_name = REPLACE(trading_name, 'ADVATRANS', 'ADVERTRANS')
WHERE trading_name ILIKE '%advatrans%';

-- 5. Fix company_name in customers_grouped
UPDATE customers_grouped
SET company_group = REPLACE(company_group, 'ADVATRANS', 'ADVERTRANS')
WHERE company_group ILIKE '%advatrans%';
