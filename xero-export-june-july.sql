-- Xero CSV export: one row per invoice, amounts built from line items
-- Invoices: 2026-06-28 to 2026-07-06
-- Credit notes: from CN-1048 creation date onwards

WITH account_lines AS (
  SELECT
    ai.invoice_number,
    ai.account_number,
    ai.company_name,
    ai.invoice_date,
    CASE
      WHEN jsonb_array_length(ai.line_items) > 0 THEN SUM((li->>'total_including_vat')::numeric)
      ELSE ROUND(ai.total_amount::numeric, 2)
    END AS total_incl,
    CASE
      WHEN jsonb_array_length(ai.line_items) > 0 THEN SUM((li->>'unit_price_without_vat')::numeric)
      ELSE ROUND((ai.total_amount::numeric / 1.15), 2)
    END AS unit_excl,
    CASE
      WHEN jsonb_array_length(ai.line_items) > 0 THEN SUM((li->>'vat_amount')::numeric)
      ELSE ROUND((ai.total_amount::numeric - ai.total_amount::numeric / 1.15), 2)
    END AS vat
  FROM account_invoices ai
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_array_length(ai.line_items) > 0 THEN ai.line_items ELSE '[{}]'::jsonb END
  ) li ON true
  WHERE ai.invoice_date >= '2026-06-28'
    AND ai.invoice_date <= '2026-07-06'
  GROUP BY ai.id, ai.invoice_number, ai.account_number, ai.company_name, ai.invoice_date, ai.total_amount
),

job_lines AS (
  SELECT
    inv.invoice_number,
    inv.account_number,
    inv.invoice_date,
    CASE
      WHEN jsonb_array_length(inv.line_items) > 0 THEN SUM((li->>'total_incl')::numeric)
      ELSE ROUND(inv.total_amount::numeric, 2)
    END AS total_incl,
    CASE
      WHEN jsonb_array_length(inv.line_items) > 0 THEN SUM((li->>'vat_amount')::numeric)
      ELSE ROUND((inv.total_amount::numeric - inv.total_amount::numeric / 1.15), 2)
    END AS vat
  FROM invoices inv
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_array_length(inv.line_items) > 0 THEN inv.line_items ELSE '[{}]'::jsonb END
  ) li ON true
  WHERE inv.invoice_date >= '2026-06-28'
    AND inv.invoice_date <= '2026-07-06'
  GROUP BY inv.id, inv.invoice_number, inv.account_number, inv.invoice_date, inv.total_amount
),

cn_start AS (
  SELECT created_at::date AS start_date
  FROM credit_notes
  WHERE credit_note_number = 'CN-1048'
),

cost_centers_distinct AS (
  SELECT DISTINCT ON (UPPER(TRIM(cost_code)))
    cost_code, company, physical_address_1, physical_address_2,
    physical_address_3, physical_area, physical_code
  FROM cost_centers
  ORDER BY UPPER(TRIM(cost_code)), id
)

SELECT
  al.company_name AS "ContactName",
  '' AS "EmailAddress",
  COALESCE(cc.physical_address_1, '') AS "POAddressLine1",
  COALESCE(cc.physical_address_2, '') AS "POAddressLine2",
  COALESCE(cc.physical_address_3, '') AS "POAddressLine3",
  '' AS "POAddressLine4",
  COALESCE(cc.physical_area, '') AS "POCity",
  '' AS "PORegion",
  COALESCE(cc.physical_code, '') AS "POPostalCode",
  'South Africa' AS "POCountry",
  al.invoice_number AS "InvoiceNumber",
  al.account_number AS "Reference",
  al.invoice_date::text AS "InvoiceDate",
  al.invoice_date::text AS "DueDate",
  ROUND(al.total_incl, 2) AS "Total",
  '' AS "InventoryItemCode",
  'Monthly Service' AS "Description",
  1 AS "Quantity",
  ROUND(al.unit_excl, 2) AS "UnitAmount",
  0 AS "Discount",
  '200' AS "AccountCode",
  'OUTPUT2' AS "TaxType",
  ROUND(al.vat, 2) AS "TaxAmount",
  '' AS "TrackingName1",
  '' AS "TrackingOption1",
  'ZAR' AS "Currency",
  '' AS "BrandingTheme"
FROM account_lines al
LEFT JOIN cost_centers_distinct cc ON UPPER(TRIM(cc.cost_code)) = UPPER(TRIM(al.account_number))

UNION ALL

SELECT
  COALESCE(cc.company, jl.account_number) AS "ContactName",
  '' AS "EmailAddress",
  COALESCE(cc.physical_address_1, '') AS "POAddressLine1",
  COALESCE(cc.physical_address_2, '') AS "POAddressLine2",
  COALESCE(cc.physical_address_3, '') AS "POAddressLine3",
  '' AS "POAddressLine4",
  COALESCE(cc.physical_area, '') AS "POCity",
  '' AS "PORegion",
  COALESCE(cc.physical_code, '') AS "POPostalCode",
  'South Africa' AS "POCountry",
  jl.invoice_number AS "InvoiceNumber",
  jl.account_number AS "Reference",
  jl.invoice_date::text AS "InvoiceDate",
  jl.invoice_date::text AS "DueDate",
  ROUND(jl.total_incl, 2) AS "Total",
  '' AS "InventoryItemCode",
  'Monthly Service' AS "Description",
  1 AS "Quantity",
  ROUND(jl.total_incl - jl.vat, 2) AS "UnitAmount",
  0 AS "Discount",
  '200' AS "AccountCode",
  'OUTPUT2' AS "TaxType",
  ROUND(jl.vat, 2) AS "TaxAmount",
  '' AS "TrackingName1",
  '' AS "TrackingOption1",
  'ZAR' AS "Currency",
  '' AS "BrandingTheme"
FROM job_lines jl
LEFT JOIN cost_centers_distinct cc ON UPPER(TRIM(cc.cost_code)) = UPPER(TRIM(jl.account_number))

UNION ALL

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
LEFT JOIN cost_centers_distinct cc ON UPPER(TRIM(cc.cost_code)) = UPPER(TRIM(cn.account_number))
CROSS JOIN cn_start
WHERE cn.created_at >= cn_start.start_date
  AND (cn.approved = true OR cn.approved IS NULL)
  AND cn.status != 'declined'

ORDER BY "InvoiceDate", "InvoiceNumber";
