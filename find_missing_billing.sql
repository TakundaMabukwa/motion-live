WITH invoiced_install_jobs AS (
  SELECT
    jc.id,
    jc.job_number,
    jc.new_account_number,
    jc.vehicle_registration,
    jc.customer_name,
    jc.completion_date,
    jc.billing_statuses->'invoice'->>'invoice_number' AS invoice_number,
    jc.quotation_products,
    jsonb_array_elements(jc.quotation_products) AS product
  FROM job_cards jc
  WHERE
    (jc.job_type ILIKE 'install' OR jc.quotation_job_type ILIKE 'install')
    AND jc.quotation_products IS NOT NULL
    AND jsonb_array_length(jc.quotation_products) > 0
    AND jc.new_account_number IS NOT NULL
    AND jc.billing_statuses IS NOT NULL
    AND jc.billing_statuses->'invoice' IS NOT NULL
    AND jc.billing_statuses->'invoice'->>'invoice_number' IS NOT NULL
),
products_with_amounts AS (
  SELECT
    ij.id,
    ij.job_number,
    ij.invoice_number,
    ij.new_account_number,
    ij.vehicle_registration,
    ij.customer_name,
    ij.completion_date,
    ij.product->>'name' AS product_name,
    ij.product->>'item_code' AS item_code,
    COALESCE((ij.product->>'rental_price')::numeric, 0) AS rental_price,
    COALESCE((ij.product->>'subscription_price')::numeric, 0) AS subscription_price
  FROM invoiced_install_jobs ij
  WHERE
    COALESCE((ij.product->>'rental_price')::numeric, 0) > 0
    OR COALESCE((ij.product->>'subscription_price')::numeric, 0) > 0
)
SELECT DISTINCT
  pwa.job_number,
  pwa.invoice_number,
  pwa.new_account_number AS account_number,
  pwa.vehicle_registration,
  pwa.customer_name,
  pwa.product_name,
  pwa.rental_price,
  pwa.subscription_price,
  pwa.completion_date,
  CASE
    WHEN vd.id IS NULL THEN 'VEHICLE MISSING from vehicles_duplicate'
    WHEN COALESCE(vd.total_rental_sub, 0) = 0 THEN 'VEHICLE EXISTS but billing columns are ZERO'
    ELSE 'Has billing - OK'
  END AS status,
  COALESCE(vd.total_rental, 0) AS existing_total_rental,
  COALESCE(vd.total_sub, 0) AS existing_total_sub,
  COALESCE(vd.total_rental_sub, 0) AS existing_total_rental_sub
FROM products_with_amounts pwa
LEFT JOIN vehicles_duplicate vd
  ON LOWER(TRIM(vd.reg)) = LOWER(TRIM(pwa.vehicle_registration))
  AND (
    LOWER(TRIM(vd.new_account_number)) = LOWER(TRIM(pwa.new_account_number))
    OR LOWER(TRIM(vd.account_number)) = LOWER(TRIM(pwa.new_account_number))
  )
WHERE
  vd.id IS NULL
  OR COALESCE(vd.total_rental_sub, 0) = 0
ORDER BY pwa.completion_date DESC NULLS LAST, pwa.job_number;
