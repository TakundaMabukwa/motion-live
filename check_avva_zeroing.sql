-- Show ALL billing columns for AVVA-0001 vehicles with deinstall annuity items
WITH avva_jobs AS (
  SELECT DISTINCT jc.vehicle_registration
  FROM job_cards jc
  LEFT JOIN invoices inv ON inv.job_card_id = jc.id
  WHERE (jc.job_status ILIKE 'invoiced' OR inv.id IS NOT NULL)
    AND jc.new_account_number = 'AVVA-0001'
    AND jc.quotation_products IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(jc.quotation_products) AS item
      WHERE item->>'annuity_end_date' IS NOT NULL
        AND (item->>'annuity_end_date')::date < CURRENT_DATE
    )
),
deinstall_items AS (
  SELECT aj.vehicle_registration,
         LOWER(TRIM(item->>'name')) AS product_name
  FROM avva_jobs aj
  CROSS JOIN LATERAL jsonb_array_elements(
    (SELECT jc.quotation_products FROM job_cards jc WHERE jc.vehicle_registration = aj.vehicle_registration LIMIT 1)
  ) AS item
  WHERE item->>'annuity_end_date' IS NOT NULL
    AND (item->>'annuity_end_date')::date < CURRENT_DATE
)
SELECT
  vd.id, vd.reg, vd.fleet_number, vd.new_account_number,
  vd.beame_1_rental, vd.beame_1_sub,
  vd.beame_2_rental, vd.beame_2_sub,
  vd.beame_3_rental, vd.beame_3_sub,
  vd.beame_4_rental, vd.beame_4_sub,
  vd.beame_5_rental, vd.beame_5_sub,
  vd.skylink_pro_rental, vd.skylink_pro_sub,
  vd.sky_scout_12v_rental, vd.sky_scout_12v_sub,
  vd.sky_ican_rental,
  vd._4ch_mdvr_rental, vd._4ch_mdvr_sub,
  vd.a2_dash_cam_rental, vd.a2_dash_cam_sub,
  vd.industrial_panic_rental,
  vd.idata_rental,
  vd.keypad_rental,
  vd.tag_rental,
  vd.dual_probe_rental, vd.dual_probe_sub,
  vd.consultancy,
  vd.roaming,
  vd.maintenance,
  vd.controlroom,
  vd.total_rental_sub,
  vd.total_rental,
  vd.total_sub
FROM vehicles_duplicate vd
WHERE vd.new_account_number = 'AVVA-0001'
  AND EXISTS (
    SELECT 1 FROM avva_jobs aj
    WHERE LOWER(TRIM(aj.vehicle_registration)) = LOWER(TRIM(vd.reg))
  )
ORDER BY vd.reg;
