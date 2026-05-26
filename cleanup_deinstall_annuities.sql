-- ============================================================
-- Cleanup deinstall annuities (expired annuity_end_date)
-- ============================================================
-- Step 1: Preview what will be zeroed
-- ============================================================
BEGIN;

SELECT id, reg, new_account_number, 
  total_rental, total_sub, total_rental_sub,
  beame_1_rental, beame_1_sub, beame_2_rental, beame_2_sub,
  skylink_pro_rental, skylink_pro_sub,
  sky_scout_12v_rental, sky_scout_12v_sub,
  sky_ican_rental, dual_probe_rental,
  consultancy, roaming, maintenance, controlroom
FROM vehicles_duplicate
WHERE id IN (
  127671, 127629, 127376, 708, 127744, 131017, 132361, 132363,
  127474, 127611, 127890, 132373, 132374, 127665, 132378, 127872,
  132379, 132384, 126832, 132336, 126853, 132337, 132338, 126858,
  126862, 132341, 132343, 126931, 126977, 132344, 132345, 126978,
  126987, 132347, 127063, 132349, 132399, 127583, 132400
)
ORDER BY reg, new_account_number;

COMMIT;

-- ============================================================
-- Step 2: Zero billing columns for these vehicles
-- ============================================================
BEGIN;

UPDATE vehicles_duplicate
SET
  total_rental = 0,
  total_sub = 0,
  total_rental_sub = 0,
  beame_1_rental = 0,
  beame_1_sub = 0,
  beame_2_rental = 0,
  beame_2_sub = 0,
  skylink_pro_rental = 0,
  skylink_pro_sub = 0,
  sky_scout_12v_rental = 0,
  sky_scout_12v_sub = 0,
  sky_ican_rental = 0,
  dual_probe_rental = 0,
  consultancy = 0,
  roaming = 0,
  maintenance = 0,
  controlroom = 0
WHERE id IN (
  127671, 127629, 127376, 708, 127744, 131017, 132361, 132363,
  127474, 127611, 127890, 132373, 132374, 127665, 132378, 127872,
  132379, 132384, 126832, 132336, 126853, 132337, 132338, 126858,
  126862, 132341, 132343, 126931, 126977, 132344, 132345, 126978,
  126987, 132347, 127063, 132349, 132399, 127583, 132400
);

COMMIT;

-- ============================================================
-- Step 3: Remove annuity_end_date from quotation_products on these deinstall jobs
-- ============================================================
-- BEGIN;
-- 
-- UPDATE job_cards jc
-- SET quotation_products = (
--   SELECT jsonb_agg(
--     CASE
--       WHEN p->>'annuity_end_date' IS NOT NULL
--         AND (p->>'annuity_end_date')::date <= CURRENT_DATE
--       THEN p - 'annuity_end_date'
--       ELSE p
--     END
--   )
--   FROM jsonb_array_elements(jc.quotation_products) AS p
-- )
-- WHERE jc.job_number IN (
--   'SOL-911463','SOL-192903','SOL-212942','SOL-115558','SOL-986357',
--   'SOL-819463','SOL-845455','SOL-481775','SOL-177383','SOL-138082',
--   'SOL-325091','SOL-645863','SOL-157603','SOL-973317','SOL-337799',
--   'SOL-773944','SOL-448270','SOL-312131','SOL-763923','SOL-707513',
--   'SOL-790665','SOL-237638','SOL-820881','SOL-460816','SOL-732843',
--   'SOL-870081','SOL-659351','SOL-391751','SOL-447800','SOL-450346'
-- );
-- 
-- COMMIT;

-- ============================================================
-- Step 4 (optional): Verify after update
-- ============================================================
-- SELECT id, reg, new_account_number, total_rental_sub
-- FROM vehicles_duplicate
-- WHERE id IN (
--   127671, 127629, 127376, 708, 127744, 131017, 132361, 132363,
--   127474, 127611, 127890, 132373, 132374, 127665, 132378, 127872,
--   132379, 132384, 126832, 132336, 126853, 132337, 132338, 126858,
--   126862, 132341, 132343, 126931, 126977, 132344, 132345, 126978,
--   126987, 132347, 127063, 132349, 132399, 127583, 132400
-- )
-- ORDER BY reg;
