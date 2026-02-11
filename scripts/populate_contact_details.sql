-- Sample data migration: Populate contact_details JSONB field
-- This populates the customers_grouped table with sample contact information

UPDATE customers_grouped 
SET contact_details = jsonb_build_object(
  'company', legal_names,
  'legal_name', legal_names,  
  'trading_name', legal_names,
  'email', 'info@' || lower(replace(legal_names, ' ', '')) || '.com',
  'cell_no', '+27 ' || (60 + (random() * 20)::int) || ' ' || (100 + (random() * 899)::int) || ' ' || (1000 + (random() * 8999)::int),
  'switchboard', '+27 ' || (11 + (random() * 10)::int) || ' ' || (200 + (random() * 799)::int) || ' ' || (1000 + (random() * 8999)::int),
  'physical_address_1', (100 + (random() * 900)::int) || ' Main Street',
  'physical_area', CASE (random() * 3)::int 
    WHEN 0 THEN 'CBD'
    WHEN 1 THEN 'Industrial Area' 
    WHEN 2 THEN 'Business Park'
    ELSE 'Commercial District'
  END,
  'physical_province', CASE (random() * 4)::int
    WHEN 0 THEN 'Gauteng'
    WHEN 1 THEN 'Western Cape'
    WHEN 2 THEN 'KwaZulu-Natal'
    WHEN 3 THEN 'Eastern Cape'
    ELSE 'Free State'
  END,
  'physical_code', (1000 + (random() * 8999)::int)::text,
  'physical_country', 'South Africa',
  'customer_validated', false,
  'created_at', now()::text,
  'last_updated', now()::text
)
WHERE contact_details IS NULL OR contact_details = '{}';

-- Verify the update
SELECT 
  id,
  legal_names,
  all_new_account_numbers,
  jsonb_pretty(contact_details) as contact_details_formatted
FROM customers_grouped 
LIMIT 3;