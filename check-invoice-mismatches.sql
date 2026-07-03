-- Extract all serials from job_cards, check where they exist elsewhere
-- Deduplicates: one row per serial per job per source table
WITH jc_serials AS (
  SELECT DISTINCT jc.job_number, jc.vehicle_registration, jc.status AS job_status,
         (p->>'serial_number')::text AS serial_number,
         (p->>'code')::text AS item_code, 'parts_required' AS jc_source
  FROM job_cards jc, jsonb_array_elements(jc.parts_required) p
  WHERE (p->>'serial_number') IS NOT NULL AND TRIM(p->>'serial_number') != ''

  UNION

  SELECT DISTINCT jc.job_number, jc.vehicle_registration, jc.status AS job_status,
         (e->>'serial_number')::text AS serial_number,
         (e->>'code')::text AS item_code, 'equipment_used' AS jc_source
  FROM job_cards jc, jsonb_array_elements(jc.equipment_used) e
  WHERE (e->>'serial_number') IS NOT NULL AND TRIM(e->>'serial_number') != ''
),

-- Vehicle hits: aggregate matching columns per serial per vehicle to avoid row explosion
vehicle_hits_raw AS (
  SELECT js.serial_number, js.job_number, js.vehicle_registration, js.item_code, js.jc_source,
         vd.reg AS match_reg, vd.fleet_number AS match_fleet,
         array_agg(DISTINCT sub.match_col) AS match_columns
  FROM jc_serials js
  JOIN vehicles_duplicate vd ON true
  CROSS JOIN LATERAL (
    SELECT key AS match_col
    FROM jsonb_each_text(to_jsonb(vd))
    WHERE value = js.serial_number
      AND value != '' AND value != 'null'
      AND key NOT IN ('id','created_at','unique_id','reg','fleet_number','new_account_number',
                       'company','branch','make','model','year','colour','account_number',
                       'cost_center_code','site_allocated','vehicle_validated','operational',
                       'annuity_flag','amount_locked','calibration','total_rental_sub',
                       'total_rental','total_sub')
  ) sub
  GROUP BY js.serial_number, js.job_number, js.vehicle_registration, js.item_code, js.jc_source,
           vd.reg, vd.fleet_number
),

vehicle_hits AS (
  SELECT serial_number, job_number, vehicle_registration, item_code, jc_source,
         'vehicles_duplicate' AS found_in, match_reg, match_fleet,
         array_to_string(match_columns, ', ') AS match_column
  FROM vehicle_hits_raw
),

inv_hits AS (
  SELECT DISTINCT js.serial_number, js.job_number, js.vehicle_registration, js.item_code, js.jc_source,
         'inventory_items' AS found_in, ii.container AS match_reg, ii.id::text AS match_fleet,
         'serial_number' AS match_column
  FROM jc_serials js
  JOIN inventory_items ii ON ii.serial_number = js.serial_number
    AND upper(coalesce(ii.status, 'IN STOCK')) = 'IN STOCK'
),

cli_hits AS (
  SELECT DISTINCT js.serial_number, js.job_number, js.vehicle_registration, js.item_code, js.jc_source,
         'client_inventory_items' AS found_in, ci.company AS match_reg, ci.id::text AS match_fleet,
         'serial_number' AS match_column
  FROM jc_serials js
  JOIN client_inventory_items ci ON ci.serial_number = js.serial_number
    AND ci.status = 'IN STOCK'
),

tech_hits AS (
  SELECT DISTINCT js.serial_number, js.job_number, js.vehicle_registration, js.item_code, js.jc_source,
         'tech_stock.assigned_parts' AS found_in, ts.technician_email AS match_reg,
         NULL::text AS match_fleet, 'serial_number' AS match_column
  FROM jc_serials js
  JOIN tech_stock ts ON ts.assigned_parts @>
    jsonb_build_array(jsonb_build_object('serial_number', js.serial_number))
)

SELECT * FROM vehicle_hits
UNION ALL SELECT * FROM inv_hits
UNION ALL SELECT * FROM cli_hits
UNION ALL SELECT * FROM tech_hits
ORDER BY serial_number, found_in;