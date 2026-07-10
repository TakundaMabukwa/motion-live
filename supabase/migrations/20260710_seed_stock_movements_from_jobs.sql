-- ============================================================
-- Seed: Log current stock positions on all jobs
-- ============================================================
-- This is a one-time snapshot. It reads parts_required and
-- equipment_used on every job card and inserts SEED entries
-- into stock_movements so you can see where every part
-- currently lives.
--
-- Safe to run multiple times — skips jobs already seeded.
-- ============================================================

-- Seed parts_required entries
INSERT INTO public.stock_movements (
  serial_number, category_code, operation,
  from_bucket, to_bucket, to_field,
  client_code, cost_code,
  job_card_id, job_number,
  new_data
)
SELECT
  item->>'serial_number' AS serial_number,
  item->>'category_code' AS category_code,
  'SEED_PARTS_REQUIRED' AS operation,
  CASE
    WHEN item->>'source' = 'tech_stock.assigned_parts' THEN 'tech'
    WHEN item->>'source' = 'inventory_items' THEN 'soltrack'
    WHEN item->>'source' LIKE 'client_inventory_items%' THEN 'client'
    ELSE NULL
  END AS from_bucket,
  'job' AS to_bucket,
  'parts_required' AS to_field,
  item->>'client_code' AS client_code,
  item->>'cost_code' AS cost_code,
  jc.id AS job_card_id,
  jc.job_number AS job_number,
  jsonb_build_object(
    'parts_required', jc.parts_required,
    'equipment_used', jc.equipment_used,
    'snapshot', true
  ) AS new_data
FROM public.job_cards jc,
     jsonb_array_elements(jc.parts_required) AS item
WHERE jc.parts_required IS NOT NULL
  AND jsonb_array_length(jc.parts_required) > 0
  AND item->>'serial_number' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.stock_movements sm
    WHERE sm.job_card_id = jc.id
      AND sm.operation = 'SEED_PARTS_REQUIRED'
      AND sm.serial_number = item->>'serial_number'
  );

-- Seed equipment_used entries
INSERT INTO public.stock_movements (
  serial_number, category_code, operation,
  from_bucket, to_bucket, to_field,
  client_code, cost_code,
  job_card_id, job_number,
  new_data
)
SELECT
  item->>'serial_number' AS serial_number,
  item->>'category_code' AS category_code,
  'SEED_EQUIPMENT_USED' AS operation,
  CASE
    WHEN item->>'source' = 'tech_stock.assigned_parts' THEN 'tech'
    WHEN item->>'source' = 'inventory_items' THEN 'soltrack'
    WHEN item->>'source' LIKE 'client_inventory_items%' THEN 'client'
    ELSE NULL
  END AS from_bucket,
  'job' AS to_bucket,
  'equipment_used' AS to_field,
  item->>'client_code' AS client_code,
  item->>'cost_code' AS cost_code,
  jc.id AS job_card_id,
  jc.job_number AS job_number,
  jsonb_build_object(
    'parts_required', jc.parts_required,
    'equipment_used', jc.equipment_used,
    'snapshot', true
  ) AS new_data
FROM public.job_cards jc,
     jsonb_array_elements(jc.equipment_used) AS item
WHERE jc.equipment_used IS NOT NULL
  AND jsonb_array_length(jc.equipment_used) > 0
  AND item->>'serial_number' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.stock_movements sm
    WHERE sm.job_card_id = jc.id
      AND sm.operation = 'SEED_EQUIPMENT_USED'
      AND sm.serial_number = item->>'serial_number'
  );
