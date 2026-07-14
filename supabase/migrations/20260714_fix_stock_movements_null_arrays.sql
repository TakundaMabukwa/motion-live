-- Fix: COALESCE null arrays to [] in all trigger functions
-- Prevents "upper bound of FOR loop cannot be null" errors

CREATE OR REPLACE FUNCTION public.log_job_cards_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_item jsonb;
  v_serial text;
  v_source text;
  v_from_bucket text;
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
        'equipment_used', v_item->>'technician_email',
        NEW.id, NEW.job_number,
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
        'job', 'equipment_used', v_item->>'technician_email',
        NEW.id, NEW.job_number,
        jsonb_build_object('equipment_used', OLD.equipment_used),
        jsonb_build_object('equipment_used', NEW.equipment_used)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

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
