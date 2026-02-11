-- Migration Script: Simplify Customer Tables
-- This script consolidates customers_grouped functionality into customers table

-- Step 1: Add company_group field to customers table (if not exists)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS company_group TEXT;

-- Step 2: Populate company_group from customers_grouped data
UPDATE customers 
SET company_group = cg.company_group || ' - ' || cg.legal_names
FROM customers_grouped cg 
WHERE customers.new_account_number = ANY(string_to_array(cg.all_new_account_numbers, ','));

-- Step 3: Add indexes for performance  
CREATE INDEX IF NOT EXISTS idx_customers_company_group ON customers(company_group);
CREATE INDEX IF NOT EXISTS idx_customers_new_account_number ON customers(new_account_number);
CREATE INDEX IF NOT EXISTS idx_customers_validation ON customers(customer_validated);

-- Step 4: Create view for any code that still references customers_grouped (optional fallback)
CREATE OR REPLACE VIEW customers_grouped_legacy AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY company_group) as id,
  company_group,
  string_agg(DISTINCT company, ', ') as legal_names,
  string_agg(DISTINCT account_number, ', ') as all_account_numbers, 
  string_agg(DISTINCT new_account_number, ', ') as all_new_account_numbers,
  MIN(created_at) as created_at,
  NULL as cost_code,
  string_agg(DISTINCT email, ', ') as contact_details
FROM customers 
WHERE company_group IS NOT NULL
GROUP BY company_group;

-- Step 5: Verification query - show the simplified structure
SELECT 
  'Simplified Structure' as action,
  COUNT(*) as total_customers,
  COUNT(DISTINCT company_group) as unique_company_groups,
  ROUND(COUNT(*)::decimal / COUNT(DISTINCT company_group), 2) as customers_per_group
FROM customers;