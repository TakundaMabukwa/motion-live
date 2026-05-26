-- ============================================================
-- Strip annuity_end_date from quotation_products for AVVA-0001
-- jobs with de-installed items that have expired annuity.
-- Run on DB1.
-- ============================================================

BEGIN;

WITH avva_jobs AS (
  SELECT jc.id, jc.job_number
  FROM job_cards jc
  LEFT JOIN invoices inv ON inv.job_card_id = jc.id
  WHERE (jc.job_status ILIKE 'invoiced' OR inv.id IS NOT NULL)
    AND jc.new_account_number = 'AVVA-0001'
    AND jc.quotation_products IS NOT NULL
    AND jc.quotation_products != '[]'::jsonb
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(jc.quotation_products) AS item
      WHERE item->>'annuity_end_date' IS NOT NULL
        AND (item->>'annuity_end_date')::date < CURRENT_DATE
    )
)
UPDATE job_cards jc
SET quotation_products = (
  SELECT jsonb_agg(
    CASE
      WHEN p->>'annuity_end_date' IS NOT NULL
        AND (p->>'annuity_end_date')::date < CURRENT_DATE
      THEN p - 'annuity_end_date'
      ELSE p
    END
  )
  FROM jsonb_array_elements(jc.quotation_products) AS p
)
FROM avva_jobs aj
WHERE jc.id = aj.id;

COMMIT;

-- Verify: should return 0 rows
SELECT 'Remaining annuity items after update:' AS info;
WITH avva_jobs AS (
  SELECT jc.id, jc.job_number, jc.vehicle_registration
  FROM job_cards jc
  WHERE jc.new_account_number = 'AVVA-0001'
)
SELECT aj.job_number, aj.vehicle_registration,
  p.item->>'name' AS product,
  p.item->>'annuity_end_date' AS still_has_annuity
FROM avva_jobs aj
CROSS JOIN LATERAL jsonb_array_elements(
  (SELECT jc.quotation_products FROM job_cards jc WHERE jc.id = aj.id)
) AS p(item)
WHERE p.item->>'annuity_end_date' IS NOT NULL;
