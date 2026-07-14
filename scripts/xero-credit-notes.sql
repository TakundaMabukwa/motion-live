WITH cost AS (
  SELECT DISTINCT ON (cost_code)
    cost_code, company, email,
    physical_address_1, physical_address_2, physical_address_3,
    physical_area, physical_code
  FROM cost_centers
  WHERE cost_code IS NOT NULL
  ORDER BY cost_code, id
)

SELECT
  COALESCE(cost.company, cn.client_name) AS "ContactName",
  COALESCE(cost.email, '') AS "EmailAddress",
  COALESCE(cost.physical_address_1, '') AS "POAddressLine1",
  COALESCE(cost.physical_address_2, '') AS "POAddressLine2",
  COALESCE(cost.physical_address_3, '') AS "POAddressLine3",
  '' AS "POAddressLine4",
  COALESCE(cost.physical_area, '') AS "POCity",
  '' AS "PORegion",
  COALESCE(cost.physical_code, '') AS "POPostalCode",
  'South Africa' AS "POCountry",
  cn.credit_note_number AS "InvoiceNumber",
  cn.account_number AS "Reference",
  TO_CHAR(cn.credit_note_date, 'DD/MM/YYYY') AS "InvoiceDate",
  TO_CHAR(cn.credit_note_date + INTERVAL '30 days', 'DD/MM/YYYY') AS "DueDate",
  ROUND(-cn.amount * 1.15, 2) AS "Total",
  '' AS "InventoryItemCode",
  COALESCE(cn.comment, 'Credit Note') AS "Description",
  1 AS "Quantity",
  ROUND(-cn.amount * 1.15, 2) AS "UnitAmount",
  0 AS "Discount",
  '200' AS "AccountCode",
  'OUTPUT2' AS "TaxType",
  ROUND(-cn.amount * 0.15, 2) AS "TaxAmount",
  '' AS "TrackingName1",
  '' AS "TrackingOption1",
  'ZAR' AS "Currency",
  '' AS "BrandingTheme"
FROM credit_notes cn
LEFT JOIN cost ON cost.cost_code = cn.account_number
WHERE cn.approved = true
  AND cn.billing_month_applies_to >= '2026-03-01' AND cn.billing_month_applies_to < '2026-07-30'
ORDER BY "InvoiceDate" NULLS LAST;
