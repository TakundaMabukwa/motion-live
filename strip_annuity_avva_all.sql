-- ============================================================
-- Step 1: Strip annuity_end_date from job_cards for ALL
-- AVVA-0001 jobs where annuity has expired (< today)
-- ============================================================

BEGIN;

UPDATE job_cards jc
SET
  annuity_end_date = NULL,
  quotation_products = (
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
WHERE jc.new_account_number = 'AVVA-0001'
  AND jc.quotation_products IS NOT NULL
  AND jc.quotation_products != '[]'::jsonb
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(jc.quotation_products) AS item
    WHERE item->>'annuity_end_date' IS NOT NULL
      AND (item->>'annuity_end_date')::date < CURRENT_DATE
  );

COMMIT;

-- ============================================================
-- Step 2: Zero billing on vehicles_duplicate for these vehicles
-- ============================================================

BEGIN;

UPDATE vehicles_duplicate vd
SET
  beame_1_rental = '0',
  beame_1_sub = '0',
  beame_2_rental = '0',
  beame_2_sub = '0',
  beame_3_rental = '0',
  beame_3_sub = '0',
  beame_4_rental = '0',
  beame_4_sub = '0',
  beame_5_rental = '0',
  beame_5_sub = '0',
  skylink_pro_rental = '0',
  skylink_pro_sub = '0',
  sky_scout_12v_rental = '0',
  sky_scout_12v_sub = '0',
  sky_ican_rental = '0',
  consultancy = '0',
  roaming = '0',
  maintenance = '0',
  controlroom = '0'
WHERE vd.new_account_number = 'AVVA-0001'
  AND LOWER(TRIM(vd.reg)) IN (
    SELECT DISTINCT LOWER(TRIM(jc.vehicle_registration))
    FROM job_cards jc
    WHERE jc.new_account_number = 'AVVA-0001'
      AND jc.quotation_products IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(jc.quotation_products) AS item
        WHERE item->>'annuity_end_date' IS NOT NULL
          AND (item->>'annuity_end_date')::date < CURRENT_DATE
      )
  );

COMMIT;

-- ============================================================
-- Verify: should return 0 rows
-- ============================================================

-- Verify job_cards annuity_end_date
SELECT jc.job_number, jc.vehicle_registration,
  p.item->>'name' AS product,
  p.item->>'annuity_end_date' AS still_has_annuity_json
FROM job_cards jc
CROSS JOIN LATERAL jsonb_array_elements(jc.quotation_products) AS p(item)
WHERE jc.new_account_number = 'AVVA-0001'
  AND p.item->>'annuity_end_date' IS NOT NULL
  AND (p.item->>'annuity_end_date')::date < CURRENT_DATE
ORDER BY jc.job_number;

-- Verify vehicles_duplicate billing
SELECT vd.id, vd.reg, vd.beame_1_rental, vd.beame_1_sub,
  vd.skylink_pro_rental, vd.roaming, vd.maintenance,
  vd.consultancy, vd.controlroom
FROM vehicles_duplicate vd
WHERE vd.new_account_number = 'AVVA-0001'
  AND LOWER(TRIM(vd.reg)) IN (
    SELECT DISTINCT LOWER(TRIM(jc.vehicle_registration))
    FROM job_cards jc
    WHERE jc.new_account_number = 'AVVA-0001'
      AND jc.annuity_end_date IS NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(jc.quotation_products) AS item
        WHERE item->>'annuity_end_date' IS NOT NULL
          AND (item->>'annuity_end_date')::date >= CURRENT_DATE
      )
  )
  AND (
    vd.beame_1_rental != '0' OR vd.beame_1_sub != '0'
    OR vd.skylink_pro_rental != '0' OR vd.roaming != '0'
    OR vd.maintenance != '0' OR vd.consultancy != '0'
    OR vd.controlroom != '0'
  );
