-- Xero CSV export: one row per invoice, amounts built from line items
-- Run date range: 2026-06-28 to 2026-07-06

-- account_invoices: amounts are strings in line_items JSONB
SELECT
  ai.company_name AS "ContactName",
  '' AS "EmailAddress",
  COALESCE(cc.physical_address_1, '') AS "POAddressLine1",
  COALESCE(cc.physical_address_2, '') AS "POAddressLine2",
  COALESCE(cc.physical_address_3, '') AS "POAddressLine3",
  '' AS "POAddressLine4",
  COALESCE(cc.physical_area, '') AS "POCity",
  '' AS "PORegion",
  COALESCE(cc.physical_code, '') AS "POPostalCode",
  'South Africa' AS "POCountry",
  ai.invoice_number AS "InvoiceNumber",
  ai.account_number AS "Reference",
  ai.invoice_date::text AS "InvoiceDate",
  ai.invoice_date::text AS "DueDate",
  ROUND(SUM((li->>'total_including_vat')::numeric), 2) AS "Total",
  '' AS "InventoryItemCode",
  'Monthly Service' AS "Description",
  1 AS "Quantity",
  ROUND(SUM((li->>'unit_price_without_vat')::numeric), 2) AS "UnitAmount",
  0 AS "Discount",
  '200' AS "AccountCode",
  'OUTPUT2' AS "TaxType",
  ROUND(SUM((li->>'vat_amount')::numeric), 2) AS "TaxAmount",
  '' AS "TrackingName1",
  '' AS "TrackingOption1",
  'ZAR' AS "Currency",
  '' AS "BrandingTheme"
FROM account_invoices ai,
  jsonb_array_elements(ai.line_items) li
LEFT JOIN cost_centers cc ON UPPER(TRIM(cc.cost_code)) = UPPER(TRIM(ai.account_number))
WHERE ai.invoice_date >= '2026-06-28'
  AND ai.invoice_date <= '2026-07-06'
GROUP BY ai.id, ai.invoice_number, ai.account_number, ai.company_name,
         ai.invoice_date, cc.physical_address_1, cc.physical_address_2,
         cc.physical_address_3, cc.physical_area, cc.physical_code

UNION ALL

-- invoices: amounts are numbers in line_items JSONB
SELECT
  inv.company_name AS "ContactName",
  '' AS "EmailAddress",
  COALESCE(cc.physical_address_1, '') AS "POAddressLine1",
  COALESCE(cc.physical_address_2, '') AS "POAddressLine2",
  COALESCE(cc.physical_address_3, '') AS "POAddressLine3",
  '' AS "POAddressLine4",
  COALESCE(cc.physical_area, '') AS "POCity",
  '' AS "PORegion",
  COALESCE(cc.physical_code, '') AS "POPostalCode",
  'South Africa' AS "POCountry",
  inv.invoice_number AS "InvoiceNumber",
  inv.account_number AS "Reference",
  inv.invoice_date::text AS "InvoiceDate",
  inv.invoice_date::text AS "DueDate",
  ROUND(SUM((li->>'total_incl')::numeric), 2) AS "Total",
  '' AS "InventoryItemCode",
  'Monthly Service' AS "Description",
  1 AS "Quantity",
  ROUND(SUM((li->>'total_incl')::numeric) - SUM((li->>'vat_amount')::numeric), 2) AS "UnitAmount",
  0 AS "Discount",
  '200' AS "AccountCode",
  'OUTPUT2' AS "TaxType",
  ROUND(SUM((li->>'vat_amount')::numeric), 2) AS "TaxAmount",
  '' AS "TrackingName1",
  '' AS "TrackingOption1",
  'ZAR' AS "Currency",
  '' AS "BrandingTheme"
FROM invoices inv,
  jsonb_array_elements(inv.line_items) li
LEFT JOIN cost_centers cc ON UPPER(TRIM(cc.cost_code)) = UPPER(TRIM(inv.account_number))
WHERE inv.invoice_date >= '2026-06-28'
  AND inv.invoice_date <= '2026-07-06'
GROUP BY inv.id, inv.invoice_number, inv.account_number, inv.company_name,
         inv.invoice_date, cc.physical_address_1, cc.physical_address_2,
         cc.physical_address_3, cc.physical_area, cc.physical_code

UNION ALL

-- Credit notes: amount is ex-VAT, add 15% VAT
SELECT
  cn.client_name AS "ContactName",
  '' AS "EmailAddress",
  COALESCE(cc.physical_address_1, '') AS "POAddressLine1",
  COALESCE(cc.physical_address_2, '') AS "POAddressLine2",
  COALESCE(cc.physical_address_3, '') AS "POAddressLine3",
  '' AS "POAddressLine4",
  COALESCE(cc.physical_area, '') AS "POCity",
  '' AS "PORegion",
  COALESCE(cc.physical_code, '') AS "POPostalCode",
  'South Africa' AS "POCountry",
  cn.credit_note_number AS "InvoiceNumber",
  cn.account_number AS "Reference",
  cn.created_at::date::text AS "InvoiceDate",
  cn.created_at::date::text AS "DueDate",
  ROUND(cn.amount * 1.15, 2) AS "Total",
  '' AS "InventoryItemCode",
  COALESCE(cn.reason, 'Credit Note') AS "Description",
  1 AS "Quantity",
  ROUND(cn.amount, 2) AS "UnitAmount",
  0 AS "Discount",
  '200' AS "AccountCode",
  'OUTPUT2' AS "TaxType",
  ROUND(cn.amount * 0.15, 2) AS "TaxAmount",
  '' AS "TrackingName1",
  '' AS "TrackingOption1",
  'ZAR' AS "Currency",
  '' AS "BrandingTheme"
FROM credit_notes cn
LEFT JOIN cost_centers cc ON UPPER(TRIM(cc.cost_code)) = UPPER(TRIM(cn.account_number))
WHERE cn.created_at >= '2026-06-28'
  AND cn.created_at <= '2026-07-06'
  AND (cn.approved = true OR cn.approved IS NULL)
  AND cn.status != 'declined'

ORDER BY "InvoiceDate", "InvoiceNumber";
