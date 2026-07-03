-- Serials that exist in job_cards AND also in inventory_items or tech_stock.assigned_parts
-- Only true duplicates: same serial used on a job AND still sitting in stock/tech inventory
WITH jc_serials AS (
  SELECT DISTINCT jc.job_number, jc.vehicle_registration, jc.status AS job_status,
         TRIM((p->>'serial_number')::text) AS serial_number,
         (p->>'code')::text AS item_code, 'parts_required' AS jc_source
  FROM job_cards jc, jsonb_array_elements(jc.parts_required) p
  WHERE (p->>'serial_number') IS NOT NULL AND TRIM(p->>'serial_number') != ''

  UNION

  SELECT DISTINCT jc.job_number, jc.vehicle_registration, jc.status AS job_status,
         TRIM((e->>'serial_number')::text) AS serial_number,
         (e->>'code')::text AS item_code, 'equipment_used' AS jc_source
  FROM job_cards jc, jsonb_array_elements(jc.equipment_used) e
  WHERE (e->>'serial_number') IS NOT NULL AND TRIM(e->>'serial_number') != ''
),

-- Serials in inventory_items (IN STOCK)
inv_hits AS (
  SELECT DISTINCT js.serial_number, js.job_number, js.vehicle_registration, js.item_code, js.jc_source,
         'inventory_items' AS stock_source, ii.container AS location,
         ii.id AS row_id
  FROM jc_serials js
  JOIN inventory_items ii ON ii.serial_number = js.serial_number
    AND upper(coalesce(ii.status, 'IN STOCK')) = 'IN STOCK'
),

-- Serials in client_inventory_items (IN STOCK)
cli_hits AS (
  SELECT DISTINCT js.serial_number, js.job_number, js.vehicle_registration, js.item_code, js.jc_source,
         'client_inventory_items' AS stock_source, ci.company AS location,
         ci.id AS row_id
  FROM jc_serials js
  JOIN client_inventory_items ci ON ci.serial_number = js.serial_number
    AND ci.status = 'IN STOCK'
),

-- Serials in tech_stock.assigned_parts — includes array index for splicing
tech_hits AS (
  SELECT DISTINCT js.serial_number, js.job_number, js.vehicle_registration, js.item_code, js.jc_source,
         'tech_stock' AS stock_source, ts.technician_email AS location,
         NULL::bigint AS row_id,
         (SELECT i FROM jsonb_array_elements(ts.assigned_parts) WITH ORDINALITY arr(item, i)
          WHERE (item->>'serial_number') = js.serial_number LIMIT 1) AS array_index
  FROM jc_serials js
  JOIN tech_stock ts ON ts.assigned_parts @>
    jsonb_build_array(jsonb_build_object('serial_number', js.serial_number))
)

SELECT serial_number, stock_source, location, job_number, vehicle_registration,
       item_code, jc_source, row_id, NULL::int AS array_index
FROM inv_hits
UNION ALL SELECT serial_number, stock_source, location, job_number, vehicle_registration,
       item_code, jc_source, row_id, NULL::int FROM cli_hits
UNION ALL SELECT serial_number, stock_source, location, job_number, vehicle_registration,
       item_code, jc_source, row_id, array_index FROM tech_hits
ORDER BY stock_source, location, serial_number;