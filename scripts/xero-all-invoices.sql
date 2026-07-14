WITH cost AS (
  SELECT DISTINCT ON (cost_code)
    cost_code, company, email,
    physical_address_1, physical_address_2, physical_address_3,
    physical_area, physical_code
  FROM cost_centers
  WHERE cost_code IS NOT NULL
  ORDER BY cost_code, id
)

-- Account Invoices (annuity billing)
SELECT
  cost.company AS "ContactName",
  COALESCE(cost.email, '') AS "EmailAddress",
  COALESCE(cost.physical_address_1, '') AS "POAddressLine1",
  COALESCE(cost.physical_address_2, '') AS "POAddressLine2",
  COALESCE(cost.physical_address_3, '') AS "POAddressLine3",
  '' AS "POAddressLine4",
  COALESCE(cost.physical_area, '') AS "POCity",
  '' AS "PORegion",
  COALESCE(cost.physical_code, '') AS "POPostalCode",
  'South Africa' AS "POCountry",
  ai.invoice_number AS "InvoiceNumber",
  ai.account_number AS "Reference",
  TO_CHAR(ai.billing_month, 'DD/MM/YYYY') AS "InvoiceDate",
  TO_CHAR(ai.billing_month + INTERVAL '30 days', 'DD/MM/YYYY') AS "DueDate",
  (SELECT SUM((li->>'total_including_vat')::numeric)
   FROM jsonb_array_elements(ai.line_items) li) AS "Total",
  '' AS "InventoryItemCode",
  COALESCE(
    (SELECT string_agg(CONCAT(li->>'description', ' x', COALESCE(li->>'quantity', '1')), ' | ')
     FROM jsonb_array_elements(ai.line_items) li),
    'Subscription/Rental'
  ) AS "Description",
  1 AS "Quantity",
  (SELECT SUM((li->>'total_including_vat')::numeric)
   FROM jsonb_array_elements(ai.line_items) li) AS "UnitAmount",
  0 AS "Discount",
  '200' AS "AccountCode",
  'OUTPUT2' AS "TaxType",
  (SELECT SUM((li->>'vat_amount')::numeric)
   FROM jsonb_array_elements(ai.line_items) li) AS "TaxAmount",
  '' AS "TrackingName1",
  '' AS "TrackingOption1",
  'ZAR' AS "Currency",
  '' AS "BrandingTheme"
FROM account_invoices ai
LEFT JOIN cost ON cost.cost_code = ai.account_number
WHERE ai.billing_month >= '2026-03-01' AND ai.billing_month < '2026-07-30'

UNION ALL

-- Job Card Invoices
SELECT
  COALESCE(cost.company, inv.client_name) AS "ContactName",
  COALESCE(cost.email, '') AS "EmailAddress",
  COALESCE(cost.physical_address_1, '') AS "POAddressLine1",
  COALESCE(cost.physical_address_2, '') AS "POAddressLine2",
  COALESCE(cost.physical_address_3, '') AS "POAddressLine3",
  '' AS "POAddressLine4",
  COALESCE(cost.physical_area, '') AS "POCity",
  '' AS "PORegion",
  COALESCE(cost.physical_code, '') AS "POPostalCode",
  'South Africa' AS "POCountry",
  inv.invoice_number AS "InvoiceNumber",
  inv.account_number AS "Reference",
  TO_CHAR(inv.invoice_date, 'DD/MM/YYYY') AS "InvoiceDate",
  TO_CHAR(inv.invoice_date + INTERVAL '30 days', 'DD/MM/YYYY') AS "DueDate",
  (SELECT SUM((li->>'total_incl')::numeric)
   FROM jsonb_array_elements(inv.line_items) li) AS "Total",
  '' AS "InventoryItemCode",
  COALESCE(
    (SELECT string_agg(CONCAT(li->>'description', ' x', COALESCE(li->>'quantity', '1')), ' | ')
     FROM jsonb_array_elements(inv.line_items) li),
    inv.client_name
  ) AS "Description",
  1 AS "Quantity",
  (SELECT SUM((li->>'total_incl')::numeric)
   FROM jsonb_array_elements(inv.line_items) li) AS "UnitAmount",
  0 AS "Discount",
  '200' AS "AccountCode",
  'OUTPUT2' AS "TaxType",
  (SELECT SUM((li->>'vat_amount')::numeric)
   FROM jsonb_array_elements(inv.line_items) li) AS "TaxAmount",
  '' AS "TrackingName1",
  '' AS "TrackingOption1",
  'ZAR' AS "Currency",
  '' AS "BrandingTheme"
FROM invoices inv
LEFT JOIN cost ON cost.cost_code = inv.account_number
WHERE inv.invoice_date >= '2026-03-01' AND inv.invoice_date < '2026-07-30'

ORDER BY "InvoiceDate" NULLS LAST;
