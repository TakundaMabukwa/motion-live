-- ============================================================
-- PART 1: Invoiced jobs with expired annuity — de-installed products
-- ============================================================

WITH invoiced_jobs AS (
  SELECT jc.id, jc.job_number, jc.vehicle_registration,
         jc.annuity_end_date, jc.job_status,
         jc.quotation_products,
         inv.invoice_number, inv.invoice_date
  FROM job_cards jc
  LEFT JOIN invoices inv ON inv.job_card_id = jc.id
  WHERE (jc.job_status ILIKE 'invoiced' OR inv.id IS NOT NULL)
    AND jc.quotation_products IS NOT NULL
    AND jc.quotation_products != '[]'::jsonb
)
SELECT
  ij.job_number,
  ij.vehicle_registration,
  ij.annuity_end_date,
  ij.job_status,
  ij.invoice_number,
  ij.invoice_date,
  item->>'name'              AS product_name,
  item->>'category'          AS product_category,
  item->>'type'              AS product_type,
  item->>'annuity_end_date'  AS annuity_end_date,
  item->>'value'             AS qp_value,
  item->>'code'              AS product_code,
  item->>'quote_item_key'    AS quote_item_key
FROM invoiced_jobs ij
CROSS JOIN LATERAL jsonb_array_elements(ij.quotation_products) AS item
WHERE item->>'annuity_end_date' IS NOT NULL
  AND (item->>'annuity_end_date')::date < CURRENT_DATE
ORDER BY ij.vehicle_registration, ij.job_number, (item->>'annuity_end_date')::date;


-- ============================================================
-- PART 2: Serial numbers from parts_required / equipment_used
-- ============================================================

WITH job_serials AS (
  SELECT jc.id, jc.job_number, jc.vehicle_registration,
         jc.parts_required, jc.equipment_used
  FROM job_cards jc
  LEFT JOIN invoices inv ON inv.job_card_id = jc.id
  WHERE (jc.job_status ILIKE 'invoiced' OR inv.id IS NOT NULL)
    AND jc.quotation_products IS NOT NULL
    AND jc.quotation_products != '[]'::jsonb
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(jc.quotation_products) AS item
      WHERE item->>'annuity_end_date' IS NOT NULL
        AND (item->>'annuity_end_date')::date < CURRENT_DATE
    )
)
SELECT
  js.job_number,
  js.vehicle_registration,
  COALESCE(p->>'serial_number', p->>'serial', p->>'serialNumber', p->>'ip_address') AS serial_number,
  p->>'name'        AS item_name,
  p->>'code'        AS item_code,
  p->>'stock_id'    AS stock_id,
  'parts_required'  AS source
FROM job_serials js
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(js.parts_required) = 'array' THEN js.parts_required ELSE '[]'::jsonb END
) AS p
WHERE COALESCE(p->>'serial_number', p->>'serial', p->>'serialNumber', p->>'ip_address') IS NOT NULL

UNION ALL

SELECT
  js.job_number,
  js.vehicle_registration,
  COALESCE(e->>'serial_number', e->>'serial', e->>'serialNumber', e->>'ip_address') AS serial_number,
  e->>'name'        AS item_name,
  e->>'code'        AS item_code,
  e->>'stock_id'    AS stock_id,
  'equipment_used'  AS source
FROM job_serials js
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(js.equipment_used) = 'array' THEN js.equipment_used ELSE '[]'::jsonb END
) AS e
WHERE COALESCE(e->>'serial_number', e->>'serial', e->>'serialNumber', e->>'ip_address') IS NOT NULL

ORDER BY vehicle_registration, job_number;


-- ============================================================
-- PART 3: Vehicle serials from vehicles_duplicate
-- Shows serial numbers stored on the vehicle record for each job
-- ============================================================

WITH invoiced_vehicles AS (
  SELECT DISTINCT jc.vehicle_registration
  FROM job_cards jc
  LEFT JOIN invoices inv ON inv.job_card_id = jc.id
  WHERE (jc.job_status ILIKE 'invoiced' OR inv.id IS NOT NULL)
    AND jc.quotation_products IS NOT NULL
    AND jc.quotation_products != '[]'::jsonb
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(jc.quotation_products) AS item
      WHERE item->>'annuity_end_date' IS NOT NULL
        AND (item->>'annuity_end_date')::date < CURRENT_DATE
    )
)
SELECT
  iv.vehicle_registration,
  vd.reg,
  vd.fleet_number,
  vd.skylink_trailer_unit_serial_number,
  vd.sky_on_batt_ign_unit_serial_number,
  vd.skylink_voice_kit_serial_number,
  vd.sky_scout_12v_serial_number,
  vd.sky_scout_24v_serial_number,
  vd.skylink_pro_serial_number,
  vd.skylink_sim_card_no,
  vd.skylink_data_number,
  vd.beame_1,
  vd.beame_2,
  vd.beame_3,
  vd.beame_4,
  vd.beame_5,
  vd.fm_unit,
  vd.sim_card_number,
  vd.data_number,
  vd.gps,
  vd.gsm,
  vd.idata,
  vd._4ch_mdvr,
  vd._5ch_mdvr,
  vd._8ch_mdvr,
  vd.a2_dash_cam,
  vd.a3_dash_cam_ai,
  vd.sky_idata,
  vd.sky_ican,
  vd.industrial_panic,
  vd.flat_panic,
  vd.buzzer,
  vd.tag,
  vd.tag_reader,
  vd.keypad,
  vd.keypad_waterproof,
  vd.early_warning,
  vd.cia,
  vd.pfk_main_unit,
  vd.breathaloc,
  vd.pfk_road_facing,
  vd.pfk_driver_facing,
  vd.pfk_dome_1,
  vd.pfk_dome_2,
  vd.pfk_5m,
  vd.pfk_10m,
  vd.pfk_15m,
  vd.pfk_20m,
  vd.roller_door_switches,
  vd.mtx_mc202x,
  vd.mtx_corpconnect_sim_number,
  vd.mtx_corpconnect_data_number,
  vd.mtx_sim_id,
  vd.pfk_corpconnect_sim_number,
  vd.pfk_corpconnect_data_number,
  vd.corpconnect_sim_no,
  vd.corpconnect_data_no,
  vd.sim_id
FROM invoiced_vehicles iv
LEFT JOIN vehicles_duplicate vd ON LOWER(TRIM(vd.reg)) = LOWER(TRIM(iv.vehicle_registration))
ORDER BY iv.vehicle_registration;
