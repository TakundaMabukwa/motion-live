-- Xero CSV: one row per line item, exact Xero import format
WITH cc_deduped AS (
  SELECT DISTINCT ON (cost_code)
    cost_code,
    company,
    physical_address_1,
    physical_address_2,
    physical_address_3,
    physical_area,
    physical_code,
    email,
    vat_number
  FROM cost_centers
  WHERE cost_code IS NOT NULL AND TRIM(cost_code) != ''
  ORDER BY cost_code, created_at DESC
)

-- Annuity invoices
SELECT
  ai.company_name AS "ContactName",
  COALESCE(cc.email, '') AS "EmailAddress",
  COALESCE(cc.physical_address_1, '') AS "POAddressLine1",
  COALESCE(cc.physical_address_2, '') AS "POAddressLine2",
  COALESCE(cc.physical_address_3, '') AS "POAddressLine3",
  '' AS "POAddressLine4",
  COALESCE(cc.physical_area, '') AS "POCity",
  '' AS "PORegion",
  COALESCE(cc.physical_code, '') AS "POPostalCode",
  'South Africa' AS "POCountry",
  ai.invoice_number AS "InvoiceNumber",
  ai.invoice_number AS "Reference",
  TO_CHAR(ai.invoice_date, 'DD/MM/YYYY') AS "InvoiceDate",
  TO_CHAR(ai.due_date, 'DD/MM/YYYY') AS "DueDate",
  ROUND((li->>'total_including_vat')::numeric, 2) AS "Total",
  (li->>'item_code')::text AS "InventoryItemCode",
  COALESCE((li->>'description')::text, '') AS "Description",
  1 AS "Quantity",
  ROUND((li->>'total_excl_vat')::numeric, 2) AS "UnitAmount",
  0 AS "Discount",
  ai.account_number AS "AccountCode",
  'OUTPUT2' AS "TaxType",
  ROUND((li->>'vat_amount')::numeric, 2) AS "TaxAmount",
  COALESCE((li->>'reg')::text, '') AS "TrackingName1",
  'Account' AS "TrackingOption1",
  'ZAR' AS "Currency",
  '' AS "BrandingTheme"
FROM account_invoices ai
LEFT JOIN cc_deduped cc ON TRIM(cc.cost_code) = TRIM(ai.account_number),
     jsonb_array_elements(ai.line_items) li
WHERE ai.billing_month = '2026-05-01'
  AND ai.total_amount > 0
  AND ai.invoice_number NOT LIKE 'CN-%'

UNION ALL

-- Job card invoices
SELECT
  inv.client_name AS "ContactName",
  COALESCE(cc.email, '') AS "EmailAddress",
  COALESCE(cc.physical_address_1, '') AS "POAddressLine1",
  COALESCE(cc.physical_address_2, '') AS "POAddressLine2",
  COALESCE(cc.physical_address_3, '') AS "POAddressLine3",
  '' AS "POAddressLine4",
  COALESCE(cc.physical_area, '') AS "POCity",
  '' AS "PORegion",
  COALESCE(cc.physical_code, '') AS "POPostalCode",
  'South Africa' AS "POCountry",
  inv.invoice_number AS "InvoiceNumber",
  inv.invoice_number AS "Reference",
  TO_CHAR(inv.invoice_date, 'DD/MM/YYYY') AS "InvoiceDate",
  TO_CHAR(inv.invoice_date + interval '30 days', 'DD/MM/YYYY') AS "DueDate",
  ROUND((li->>'total_incl')::numeric, 2) AS "Total",
  (li->>'item_code')::text AS "InventoryItemCode",
  COALESCE((li->>'description')::text, '') AS "Description",
  COALESCE((li->>'quantity')::int, 1) AS "Quantity",
  ROUND((li->>'unit_price')::numeric, 2) AS "UnitAmount",
  0 AS "Discount",
  inv.account_number AS "AccountCode",
  'OUTPUT2' AS "TaxType",
  ROUND((li->>'vat_amount')::numeric, 2) AS "TaxAmount",
  COALESCE((li->>'new_reg')::text, '') AS "TrackingName1",
  'Account' AS "TrackingOption1",
  'ZAR' AS "Currency",
  '' AS "BrandingTheme"
FROM invoices inv
LEFT JOIN cc_deduped cc ON TRIM(cc.cost_code) = TRIM(inv.account_number),
     jsonb_array_elements(inv.line_items) li
WHERE inv.invoice_date >= '2026-05-01'
  AND inv.invoice_date <= '2026-05-31'
  AND inv.total_amount > 0
  AND inv.invoice_number NOT LIKE 'CN-%'

ORDER BY "InvoiceNumber", "InventoryItemCode";
