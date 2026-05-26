-- ============================================================
-- Step 1: Preview — see what will be zeroed
-- ============================================================

WITH invoiced_jobs AS (
  SELECT DISTINCT jc.id, jc.job_number, jc.vehicle_registration
  FROM job_cards jc
  LEFT JOIN invoices inv ON inv.job_card_id = jc.id
  WHERE (jc.job_status ILIKE 'invoiced' OR inv.id IS NOT NULL)
    AND jc.quotation_products IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(jc.quotation_products) AS item
      WHERE item->>'annuity_end_date' IS NOT NULL
        AND (item->>'annuity_end_date')::date < CURRENT_DATE
    )
),
deinstall_items AS (
  SELECT ij.id AS job_id, ij.job_number, ij.vehicle_registration,
         LOWER(TRIM(item->>'name')) AS product_name
  FROM invoiced_jobs ij
  CROSS JOIN LATERAL jsonb_array_elements(
    (SELECT jc.quotation_products FROM job_cards jc WHERE jc.id = ij.id)
  ) AS item
  WHERE item->>'annuity_end_date' IS NOT NULL
    AND (item->>'annuity_end_date')::date < CURRENT_DATE
),
product_billing_map AS (
  SELECT DISTINCT di.vehicle_registration, di.product_name, di.job_number,
    CASE
      WHEN di.product_name LIKE '%beame%' THEN 'beame'
      WHEN di.product_name IN ('skylink pro 2g 3g 4g', 'skylink pro', 'skylite') THEN 'skylink_pro'
      WHEN di.product_name = 'skylink scout 12v' THEN 'sky_scout_12v'
      WHEN di.product_name IN ('sky-can', 'sky ican', 'skycan') THEN 'sky_ican'
      WHEN di.product_name IN ('4 channel dvr', '4ch dvr') THEN '4ch_mdvr'
      WHEN di.product_name IN ('a2 dashcam', 'a2 dash cam') THEN 'a2_dash_cam'
      WHEN di.product_name IN ('industrial', 'industrial panic') THEN 'industrial_panic'
      WHEN di.product_name IN ('idata', 'i data') THEN 'idata'
      WHEN di.product_name IN ('keypad', 'driver id keypad') THEN 'keypad'
      WHEN di.product_name = 'tag' THEN 'tag'
      WHEN di.product_name IN ('dual probe', 'dual probe rental') THEN 'dual_probe'
      WHEN di.product_name IN ('labour', 'labour charge', 'consultancy') THEN 'consultancy'
      WHEN di.product_name = 'roaming' THEN 'roaming'
      WHEN di.product_name = 'maintenance' THEN 'maintenance'
      WHEN di.product_name IN ('controlroom', 'control room') THEN 'controlroom'
      ELSE NULL
    END AS billing_group
  FROM deinstall_items di
)
SELECT
  vd.id AS vehicle_id, vd.reg, pb.vehicle_registration,
  pb.job_number, pb.product_name, pb.billing_group,
  CASE pb.billing_group
    WHEN 'beame' THEN 'beame_1_rental, beame_1_sub, beame_2_rental, beame_2_sub, beame_3_rental, beame_3_sub, beame_4_rental, beame_4_sub, beame_5_rental, beame_5_sub'
    WHEN 'skylink_pro' THEN 'skylink_pro_rental, skylink_pro_sub'
    WHEN 'sky_scout_12v' THEN 'sky_scout_12v_rental, sky_scout_12v_sub'
    WHEN 'sky_ican' THEN 'sky_ican_rental'
    WHEN '4ch_mdvr' THEN '_4ch_mdvr_rental, _4ch_mdvr_sub'
    WHEN 'a2_dash_cam' THEN 'a2_dash_cam_rental, a2_dash_cam_sub'
    WHEN 'industrial_panic' THEN 'industrial_panic_rental'
    WHEN 'idata' THEN 'idata_rental'
    WHEN 'keypad' THEN 'keypad_rental'
    WHEN 'tag' THEN 'tag_rental'
    WHEN 'dual_probe' THEN 'dual_probe_rental, dual_probe_sub'
    WHEN 'consultancy' THEN 'consultancy'
    WHEN 'roaming' THEN 'roaming'
    WHEN 'maintenance' THEN 'maintenance'
    WHEN 'controlroom' THEN 'controlroom'
  END AS columns_to_zero
FROM product_billing_map pb
LEFT JOIN vehicles_duplicate vd ON LOWER(TRIM(vd.reg)) = LOWER(TRIM(pb.vehicle_registration))
ORDER BY pb.vehicle_registration, pb.product_name;


-- ============================================================
-- Step 2: UPDATE — uncomment and run to zero the billing
-- ============================================================

-- BEGIN;
--
-- WITH invoiced_jobs AS (
--   SELECT DISTINCT jc.id, jc.job_number, jc.vehicle_registration
--   FROM job_cards jc
--   LEFT JOIN invoices inv ON inv.job_card_id = jc.id
--   WHERE (jc.job_status ILIKE 'invoiced' OR inv.id IS NOT NULL)
--     AND jc.quotation_products IS NOT NULL
--     AND EXISTS (
--       SELECT 1 FROM jsonb_array_elements(jc.quotation_products) AS item
--       WHERE item->>'annuity_end_date' IS NOT NULL
--         AND (item->>'annuity_end_date')::date < CURRENT_DATE
--     )
-- ),
-- deinstall_items AS (
--   SELECT ij.id AS job_id, ij.vehicle_registration,
--          LOWER(TRIM(item->>'name')) AS product_name
--   FROM invoiced_jobs ij
--   CROSS JOIN LATERAL jsonb_array_elements(
--     (SELECT jc.quotation_products FROM job_cards jc WHERE jc.id = ij.id)
--   ) AS item
--   WHERE item->>'annuity_end_date' IS NOT NULL
--     AND (item->>'annuity_end_date')::date < CURRENT_DATE
-- ),
-- product_billing_map AS (
--   SELECT DISTINCT di.vehicle_registration,
--     CASE
--       WHEN di.product_name LIKE '%beame%' THEN 'beame'
--       WHEN di.product_name IN ('skylink pro 2g 3g 4g', 'skylink pro', 'skylite') THEN 'skylink_pro'
--       WHEN di.product_name = 'skylink scout 12v' THEN 'sky_scout_12v'
--       WHEN di.product_name IN ('sky-can', 'sky ican', 'skycan') THEN 'sky_ican'
--       WHEN di.product_name IN ('4 channel dvr', '4ch dvr') THEN '4ch_mdvr'
--       WHEN di.product_name IN ('a2 dashcam', 'a2 dash cam') THEN 'a2_dash_cam'
--       WHEN di.product_name IN ('industrial', 'industrial panic') THEN 'industrial_panic'
--       WHEN di.product_name IN ('idata', 'i data') THEN 'idata'
--       WHEN di.product_name IN ('keypad', 'driver id keypad') THEN 'keypad'
--       WHEN di.product_name = 'tag' THEN 'tag'
--       WHEN di.product_name IN ('dual probe', 'dual probe rental') THEN 'dual_probe'
--       WHEN di.product_name IN ('labour', 'labour charge', 'consultancy') THEN 'consultancy'
--       WHEN di.product_name = 'roaming' THEN 'roaming'
--       WHEN di.product_name = 'maintenance' THEN 'maintenance'
--       WHEN di.product_name IN ('controlroom', 'control room') THEN 'controlroom'
--       ELSE NULL
--     END AS billing_group
--   FROM deinstall_items di
-- )
-- UPDATE vehicles_duplicate vd
-- SET
--   beame_1_rental = CASE WHEN billing.beame THEN '0' ELSE beame_1_rental END,
--   beame_1_sub = CASE WHEN billing.beame THEN '0' ELSE beame_1_sub END,
--   beame_2_rental = CASE WHEN billing.beame THEN '0' ELSE beame_2_rental END,
--   beame_2_sub = CASE WHEN billing.beame THEN '0' ELSE beame_2_sub END,
--   beame_3_rental = CASE WHEN billing.beame THEN '0' ELSE beame_3_rental END,
--   beame_3_sub = CASE WHEN billing.beame THEN '0' ELSE beame_3_sub END,
--   beame_4_rental = CASE WHEN billing.beame THEN '0' ELSE beame_4_rental END,
--   beame_4_sub = CASE WHEN billing.beame THEN '0' ELSE beame_4_sub END,
--   beame_5_rental = CASE WHEN billing.beame THEN '0' ELSE beame_5_rental END,
--   beame_5_sub = CASE WHEN billing.beame THEN '0' ELSE beame_5_sub END,
--   skylink_pro_rental = CASE WHEN billing.skylink_pro THEN '0' ELSE skylink_pro_rental END,
--   skylink_pro_sub = CASE WHEN billing.skylink_pro THEN '0' ELSE skylink_pro_sub END,
--   sky_scout_12v_rental = CASE WHEN billing.sky_scout_12v THEN '0' ELSE sky_scout_12v_rental END,
--   sky_scout_12v_sub = CASE WHEN billing.sky_scout_12v THEN '0' ELSE sky_scout_12v_sub END,
--   sky_ican_rental = CASE WHEN billing.sky_ican THEN '0' ELSE sky_ican_rental END,
--   _4ch_mdvr_rental = CASE WHEN billing."4ch_mdvr" THEN '0' ELSE _4ch_mdvr_rental END,
--   _4ch_mdvr_sub = CASE WHEN billing."4ch_mdvr" THEN '0' ELSE _4ch_mdvr_sub END,
--   a2_dash_cam_rental = CASE WHEN billing.a2_dash_cam THEN '0' ELSE a2_dash_cam_rental END,
--   a2_dash_cam_sub = CASE WHEN billing.a2_dash_cam THEN '0' ELSE a2_dash_cam_sub END,
--   industrial_panic_rental = CASE WHEN billing.industrial_panic THEN '0' ELSE industrial_panic_rental END,
--   idata_rental = CASE WHEN billing.idata THEN '0' ELSE idata_rental END,
--   keypad_rental = CASE WHEN billing.keypad THEN '0' ELSE keypad_rental END,
--   tag_rental = CASE WHEN billing.tag THEN '0' ELSE tag_rental END,
--   dual_probe_rental = CASE WHEN billing.dual_probe THEN '0' ELSE dual_probe_rental END,
--   dual_probe_sub = CASE WHEN billing.dual_probe THEN '0' ELSE dual_probe_sub END,
--   consultancy = CASE WHEN billing.consultancy THEN '0' ELSE vd.consultancy END,
--   roaming = CASE WHEN billing.roaming THEN '0' ELSE vd.roaming END,
--   maintenance = CASE WHEN billing.maintenance THEN '0' ELSE vd.maintenance END,
--   controlroom = CASE WHEN billing.controlroom THEN '0' ELSE vd.controlroom END
-- FROM (
--   SELECT vd.id,
--     bool_or(CASE WHEN pb.billing_group = 'beame' THEN true ELSE false END) AS beame,
--     bool_or(CASE WHEN pb.billing_group = 'skylink_pro' THEN true ELSE false END) AS skylink_pro,
--     bool_or(CASE WHEN pb.billing_group = 'sky_scout_12v' THEN true ELSE false END) AS sky_scout_12v,
--     bool_or(CASE WHEN pb.billing_group = 'sky_ican' THEN true ELSE false END) AS sky_ican,
--     bool_or(CASE WHEN pb.billing_group = '4ch_mdvr' THEN true ELSE false END) AS "4ch_mdvr",
--     bool_or(CASE WHEN pb.billing_group = 'a2_dash_cam' THEN true ELSE false END) AS a2_dash_cam,
--     bool_or(CASE WHEN pb.billing_group = 'industrial_panic' THEN true ELSE false END) AS industrial_panic,
--     bool_or(CASE WHEN pb.billing_group = 'idata' THEN true ELSE false END) AS idata,
--     bool_or(CASE WHEN pb.billing_group = 'keypad' THEN true ELSE false END) AS keypad,
--     bool_or(CASE WHEN pb.billing_group = 'tag' THEN true ELSE false END) AS tag,
--     bool_or(CASE WHEN pb.billing_group = 'dual_probe' THEN true ELSE false END) AS dual_probe,
--     bool_or(CASE WHEN pb.billing_group = 'consultancy' THEN true ELSE false END) AS consultancy,
--     bool_or(CASE WHEN pb.billing_group = 'roaming' THEN true ELSE false END) AS roaming,
--     bool_or(CASE WHEN pb.billing_group = 'maintenance' THEN true ELSE false END) AS maintenance,
--     bool_or(CASE WHEN pb.billing_group = 'controlroom' THEN true ELSE false END) AS controlroom
--   FROM vehicles_duplicate vd
--   INNER JOIN product_billing_map pb ON LOWER(TRIM(vd.reg)) = LOWER(TRIM(pb.vehicle_registration))
--   GROUP BY vd.id
-- ) billing
-- WHERE vd.id = billing.id
--   AND (
--     billing.beame OR billing.skylink_pro OR billing.sky_scout_12v OR billing.sky_ican
--     OR billing."4ch_mdvr" OR billing.a2_dash_cam OR billing.industrial_panic
--     OR billing.idata OR billing.keypad OR billing.tag OR billing.dual_probe
--     OR billing.consultancy OR billing.roaming OR billing.maintenance OR billing.controlroom
--   );
--
-- COMMIT;
