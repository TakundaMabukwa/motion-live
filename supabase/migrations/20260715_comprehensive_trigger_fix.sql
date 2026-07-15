-- COMPREHENSIVE FIX: All trigger functions on job_cards that use jsonb_array_elements
-- Run this entire block in Supabase SQL Editor

-- 1. Fix log_job_cards_stock_movement
CREATE OR REPLACE FUNCTION public.log_job_cards_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_item jsonb;
  v_serial text;
  v_source text;
BEGIN
  IF OLD.parts_required IS DISTINCT FROM NEW.parts_required THEN
    FOR v_serial, v_item IN
      SELECT item->>'serial_number', item
      FROM jsonb_array_elements(COALESCE(OLD.parts_required, '[]'::jsonb)) AS item
      WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.parts_required, '[]'::jsonb)) AS n
        WHERE n->>'serial_number' = item->>'serial_number'
      )
    LOOP
      v_source := v_item->>'source';
      INSERT INTO public.stock_movements (
        serial_number, category_code, operation,
        from_bucket, to_bucket, from_field,
        job_card_id, job_number, old_data, new_data
      ) VALUES (
        v_serial, v_item->>'category_code', 'PART_REMOVED_FROM_PARTS_REQUIRED',
        'job',
        CASE WHEN v_source = 'tech_stock.assigned_parts' THEN 'tech'
             WHEN v_source = 'inventory_items' THEN 'soltrack'
             WHEN v_source LIKE 'client_inventory_items%' THEN 'client'
             ELSE NULL END,
        'parts_required', NEW.id, NEW.job_number,
        jsonb_build_object('parts_required', OLD.parts_required),
        jsonb_build_object('parts_required', NEW.parts_required)
      );
    END LOOP;

    FOR v_serial, v_item IN
      SELECT item->>'serial_number', item
      FROM jsonb_array_elements(COALESCE(NEW.parts_required, '[]'::jsonb)) AS item
      WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(OLD.parts_required, '[]'::jsonb)) AS o
        WHERE o->>'serial_number' = item->>'serial_number'
      )
    LOOP
      v_source := v_item->>'source';
      INSERT INTO public.stock_movements (
        serial_number, category_code, operation,
        from_bucket, to_bucket, to_field,
        job_card_id, job_number, old_data, new_data
      ) VALUES (
        v_serial, v_item->>'category_code', 'PART_ADDED_TO_PARTS_REQUIRED',
        CASE WHEN v_source = 'tech_stock.assigned_parts' THEN 'tech'
             WHEN v_source = 'inventory_items' THEN 'soltrack'
             WHEN v_source LIKE 'client_inventory_items%' THEN 'client'
             ELSE NULL END,
        'job', 'parts_required', NEW.id, NEW.job_number,
        jsonb_build_object('parts_required', OLD.parts_required),
        jsonb_build_object('parts_required', NEW.parts_required)
      );
    END LOOP;
  END IF;

  IF OLD.equipment_used IS DISTINCT FROM NEW.equipment_used THEN
    FOR v_serial, v_item IN
      SELECT item->>'serial_number', item
      FROM jsonb_array_elements(COALESCE(OLD.equipment_used, '[]'::jsonb)) AS item
      WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.equipment_used, '[]'::jsonb)) AS n
        WHERE n->>'serial_number' = item->>'serial_number'
      )
    LOOP
      v_source := v_item->>'source';
      INSERT INTO public.stock_movements (
        serial_number, category_code, operation,
        from_bucket, to_bucket, from_field, from_owner,
        job_card_id, job_number, old_data, new_data
      ) VALUES (
        v_serial, v_item->>'category_code', 'PART_REMOVED_FROM_EQUIPMENT_USED',
        'job',
        CASE WHEN v_source = 'tech_stock.assigned_parts' THEN 'tech'
             WHEN v_source = 'inventory_items' THEN 'soltrack'
             WHEN v_source LIKE 'client_inventory_items%' THEN 'client'
             ELSE NULL END,
        'equipment_used', NEW.id, NEW.job_number,
        jsonb_build_object('equipment_used', OLD.equipment_used),
        jsonb_build_object('equipment_used', NEW.equipment_used)
      );
    END LOOP;

    FOR v_serial, v_item IN
      SELECT item->>'serial_number', item
      FROM jsonb_array_elements(COALESCE(NEW.equipment_used, '[]'::jsonb)) AS item
      WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(OLD.equipment_used, '[]'::jsonb)) AS o
        WHERE o->>'serial_number' = item->>'serial_number'
      )
    LOOP
      v_source := v_item->>'source';
      INSERT INTO public.stock_movements (
        serial_number, category_code, operation,
        from_bucket, to_bucket, to_field, to_owner,
        job_card_id, job_number, old_data, new_data
      ) VALUES (
        v_serial, v_item->>'category_code', 'PART_ADDED_TO_EQUIPMENT_USED',
        CASE WHEN v_source = 'tech_stock.assigned_parts' THEN 'tech'
             WHEN v_source = 'inventory_items' THEN 'soltrack'
             WHEN v_source LIKE 'client_inventory_items%' THEN 'client'
             ELSE NULL END,
        'job', 'equipment_used', NEW.id, NEW.job_number,
        jsonb_build_object('equipment_used', OLD.equipment_used),
        jsonb_build_object('equipment_used', NEW.equipment_used)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Fix log_tech_stock_movement
CREATE OR REPLACE FUNCTION public.log_tech_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_item jsonb;
  v_serial text;
BEGIN
  IF OLD.assigned_parts IS NOT DISTINCT FROM NEW.assigned_parts THEN
    RETURN NEW;
  END IF;

  FOR v_serial, v_item IN
    SELECT item->>'serial_number', item
    FROM jsonb_array_elements(COALESCE(OLD.assigned_parts, '[]'::jsonb)) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.assigned_parts, '[]'::jsonb)) AS n
      WHERE n->>'serial_number' = item->>'serial_number'
    )
  LOOP
    INSERT INTO public.stock_movements (
      serial_number, category_code, operation,
      from_bucket, to_bucket, from_owner,
      old_data, new_data, diff
    ) VALUES (
      v_serial, v_item->>'category_code', 'PART_REMOVED',
      'tech', NULL, OLD.technician_email,
      jsonb_build_object('assigned_parts', OLD.assigned_parts),
      jsonb_build_object('assigned_parts', NEW.assigned_parts),
      jsonb_build_object('removed', jsonb_build_array(v_item))
    );
  END LOOP;

  FOR v_serial, v_item IN
    SELECT item->>'serial_number', item
    FROM jsonb_array_elements(COALESCE(NEW.assigned_parts, '[]'::jsonb)) AS item
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(OLD.assigned_parts, '[]'::jsonb)) AS o
      WHERE o->>'serial_number' = item->>'serial_number'
    )
  LOOP
    INSERT INTO public.stock_movements (
      serial_number, category_code, operation,
      from_bucket, to_bucket, to_owner,
      old_data, new_data, diff
    ) VALUES (
      v_serial, v_item->>'category_code', 'PART_ADDED',
      NULL, 'tech', NEW.technician_email,
      jsonb_build_object('assigned_parts', OLD.assigned_parts),
      jsonb_build_object('assigned_parts', NEW.assigned_parts),
      jsonb_build_object('added', jsonb_build_array(v_item))
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3. Fix calculate_job_duration (null-safe)
CREATE OR REPLACE FUNCTION public.calculate_job_duration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.estimated_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Fix validate_technician_booking (null-safe)
CREATE OR REPLACE FUNCTION public.validate_technician_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.technician_name IS NULL OR trim(NEW.technician_name) = '' THEN
    RETURN NEW;
  END IF;
  IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Fix sync_job_card_accounts (null-safe)
CREATE OR REPLACE FUNCTION public.sync_job_card_accounts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.account_number IS DISTINCT FROM OLD.account_number) THEN
    IF NEW.account_number IS NOT NULL AND trim(NEW.account_number) != '' THEN
      INSERT INTO public.account_cost_centers (account_number, cost_code)
      VALUES (NEW.account_number, NEW.account_number)
      ON CONFLICT (account_number) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Verify: list all triggers on job_cards
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'job_cards'
ORDER BY trigger_name;
