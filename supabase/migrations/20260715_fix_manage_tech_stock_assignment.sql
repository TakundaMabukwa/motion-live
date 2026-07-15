-- FIX: manage_tech_stock_assignment has numeric FOR loops with null upper bound
-- When technician_phone is NULL, array_length() returns NULL, causing "upper bound of FOR loop cannot be null"

CREATE OR REPLACE FUNCTION public.manage_tech_stock_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    old_emails TEXT[];
    new_emails TEXT[];
    email TEXT;
    part_record RECORD;
    part_key TEXT;
    part_quantity INTEGER;
    existing_stock JSONB;
    new_stock JSONB;
    parts_to_transfer JSONB;
    arr_len INTEGER;
BEGIN
    -- Parse comma-separated emails
    IF OLD.technician_phone IS NOT NULL AND trim(OLD.technician_phone) != '' THEN
        old_emails := string_to_array(trim(OLD.technician_phone), ',');
        arr_len := COALESCE(array_length(old_emails, 1), 0);
        FOR i IN 1..arr_len LOOP
            old_emails[i] := trim(old_emails[i]);
        END LOOP;
    ELSE
        old_emails := ARRAY[]::TEXT[];
    END IF;
    
    IF NEW.technician_phone IS NOT NULL AND trim(NEW.technician_phone) != '' THEN
        new_emails := string_to_array(trim(NEW.technician_phone), ',');
        arr_len := COALESCE(array_length(new_emails, 1), 0);
        FOR i IN 1..arr_len LOOP
            new_emails[i] := trim(new_emails[i]);
        END LOOP;
    ELSE
        new_emails := ARRAY[]::TEXT[];
    END IF;
    
    -- Only proceed if there are parts to manage
    IF NEW.parts_required IS NOT NULL AND jsonb_array_length(NEW.parts_required) > 0 THEN
        
        -- Build parts object from job parts_required
        parts_to_transfer := '{}'::jsonb;
        FOR part_record IN 
            SELECT * FROM jsonb_array_elements(COALESCE(NEW.parts_required, '[]'::jsonb))
        LOOP
            part_key := COALESCE(part_record.value->>'code', part_record.value->>'description');
            part_quantity := COALESCE((part_record.value->>'quantity')::integer, 0);
            
            IF part_key IS NOT NULL AND part_quantity > 0 THEN
                parts_to_transfer := jsonb_set(
                    parts_to_transfer,
                    ARRAY[part_key],
                    jsonb_build_object(
                        'count', part_quantity,
                        'description', COALESCE(part_record.value->>'description', '')
                    )
                );
            END IF;
        END LOOP;
        
        -- Remove parts from old technicians (if any)
        FOREACH email IN ARRAY old_emails LOOP
            IF email IS NOT NULL AND email != '' AND NOT (email = ANY(new_emails)) THEN
                SELECT stock INTO existing_stock 
                FROM tech_stock 
                WHERE technician_email = email;
                
                IF existing_stock IS NOT NULL THEN
                    new_stock := existing_stock;
                    
                    FOR part_key IN SELECT jsonb_object_keys(parts_to_transfer) LOOP
                        part_quantity := (parts_to_transfer->part_key->>'count')::integer;
                        
                        IF new_stock ? part_key THEN
                            IF (new_stock->part_key->>'count')::integer <= part_quantity THEN
                                new_stock := new_stock - part_key;
                            ELSE
                                new_stock := jsonb_set(
                                    new_stock,
                                    ARRAY[part_key, 'count'],
                                    ((new_stock->part_key->>'count')::integer - part_quantity)::text::jsonb
                                );
                            END IF;
                        END IF;
                    END LOOP;
                    
                    UPDATE tech_stock 
                    SET stock = new_stock 
                    WHERE technician_email = email;
                END IF;
            END IF;
        END LOOP;
        
        -- Add parts to new technicians
        FOREACH email IN ARRAY new_emails LOOP
            IF email IS NOT NULL AND email != '' THEN
                SELECT stock INTO existing_stock 
                FROM tech_stock 
                WHERE technician_email = email;
                
                IF existing_stock IS NULL THEN
                    existing_stock := '{}'::jsonb;
                END IF;
                
                new_stock := existing_stock;
                
                FOR part_key IN SELECT jsonb_object_keys(parts_to_transfer) LOOP
                    part_quantity := (parts_to_transfer->part_key->>'count')::integer;
                    
                    IF new_stock ? part_key THEN
                        new_stock := jsonb_set(
                            new_stock,
                            ARRAY[part_key, 'count'],
                            ((new_stock->part_key->>'count')::integer + part_quantity)::text::jsonb
                        );
                    ELSE
                        new_stock := jsonb_set(
                            new_stock,
                            ARRAY[part_key],
                            parts_to_transfer->part_key
                        );
                    END IF;
                END LOOP;
                
                INSERT INTO tech_stock (technician_email, stock)
                VALUES (email, new_stock)
                ON CONFLICT (technician_email) 
                DO UPDATE SET stock = new_stock;
            END IF;
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$function$;
