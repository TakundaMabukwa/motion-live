CREATE OR REPLACE FUNCTION populate_payments_from_vehicles()
RETURNS TABLE (
    processed_count INTEGER,
    total_amount NUMERIC,
    message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    vehicle_record RECORD;
    total_excl_vat NUMERIC;
    total_vat NUMERIC;
    total_incl_vat NUMERIC;
    processed INTEGER := 0;
    grand_total NUMERIC := 0;
    vat_rate NUMERIC := 0.15;
BEGIN
    FOR vehicle_record IN 
        SELECT 
            id,
            company,
            new_account_number,
            fleet_number,
            reg,
            -- Calculate totals by category
            (COALESCE(NULLIF(skylink_trailer_unit_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(skylink_voice_kit_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(skylink_pro_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(skylink_trailer_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(skylink_voice_kit_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(skylink_pro_sub, '')::NUMERIC, 0)) AS skylink_total,
            
            (COALESCE(NULLIF(sky_on_batt_ign_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_scout_12v_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_scout_24v_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_idata_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_ican_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_on_batt_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_scout_12v_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_scout_24v_sub, '')::NUMERIC, 0)) AS sky_total,
            
            (COALESCE(NULLIF(beame_1_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_2_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_3_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_4_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_5_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_1_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_2_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_3_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_4_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_5_sub, '')::NUMERIC, 0)) AS beame_total,
            
            (COALESCE(NULLIF(consultancy, '')::NUMERIC, 0) +
             COALESCE(NULLIF(roaming, '')::NUMERIC, 0) +
             COALESCE(NULLIF(maintenance, '')::NUMERIC, 0) +
             COALESCE(NULLIF(after_hours, '')::NUMERIC, 0) +
             COALESCE(NULLIF(controlroom, '')::NUMERIC, 0)) AS services_total,
            
            -- Calculate final total excluding VAT (sum all individual columns)
            (COALESCE(NULLIF(skylink_trailer_unit_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_on_batt_ign_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(skylink_voice_kit_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_scout_12v_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_scout_24v_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(skylink_pro_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_idata_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_ican_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(industrial_panic_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(flat_panic_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(buzzer_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(tag_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(tag_reader_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(keypad_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(early_warning_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(cia_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(fm_unit_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(gps_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(gsm_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_1_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_2_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_3_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_4_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_5_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(_4ch_mdvr_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(_5ch_mdvr_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(_8ch_mdvr_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(a2_dash_cam_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(pfk_main_unit_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(breathaloc_rental, '')::NUMERIC, 0) +
             COALESCE(NULLIF(consultancy, '')::NUMERIC, 0) +
             COALESCE(NULLIF(roaming, '')::NUMERIC, 0) +
             COALESCE(NULLIF(maintenance, '')::NUMERIC, 0) +
             COALESCE(NULLIF(after_hours, '')::NUMERIC, 0) +
             COALESCE(NULLIF(controlroom, '')::NUMERIC, 0) +
             -- Add all subscription amounts
             COALESCE(NULLIF(skylink_trailer_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_on_batt_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(skylink_voice_kit_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_scout_12v_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(sky_scout_24v_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(skylink_pro_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(fm_unit_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_1_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_2_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_3_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_4_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(beame_5_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(_4ch_mdvr_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(_5ch_mdvr_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(_8ch_mdvr_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(a2_dash_cam_sub, '')::NUMERIC, 0) +
             COALESCE(NULLIF(pfk_main_unit_sub, '')::NUMERIC, 0)) AS calculated_total
        FROM vehicles 
        WHERE new_account_number IS NOT NULL 
        AND new_account_number != ''
    LOOP
        IF vehicle_record.calculated_total <= 0 THEN
            CONTINUE;
        END IF;
        
        -- Calculate VAT: total is excluding VAT, multiply by 0.15 to get VAT
        total_excl_vat := vehicle_record.calculated_total;
        total_vat := total_excl_vat * vat_rate;
        total_incl_vat := total_excl_vat + total_vat;
        
        INSERT INTO payments_ (
            company,
            cost_code,
            amount_excl_vat,
            vat_amount,
            amount_incl_vat,
            due_amount,
            paid_amount,
            balance_due,
            payment_status,
            billing_month,
            invoice_date,
            due_date,
            last_updated,
            reference
        ) VALUES (
            vehicle_record.company,
            vehicle_record.new_account_number,
            total_excl_vat,
            total_vat,
            total_incl_vat,
            total_incl_vat,
            0,
            total_incl_vat,
            'pending',
            DATE_TRUNC('month', CURRENT_DATE),
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '30 days',
            CURRENT_TIMESTAMP,
            'Vehicle: ' || vehicle_record.id || ' | Skylink: ' || vehicle_record.skylink_total || 
            ' | Sky: ' || vehicle_record.sky_total ||
            ' | Beame: ' || vehicle_record.beame_total ||
            ' | Services: ' || vehicle_record.services_total
        );
        
        processed := processed + 1;
        grand_total := grand_total + total_incl_vat;
    END LOOP;
    
    RETURN QUERY SELECT processed, grand_total, 
        'Processed ' || processed || ' vehicles. Total: ' || grand_total::TEXT;
END;
$$;