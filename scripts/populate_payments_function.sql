

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
    vat_rate NUMERIC := 0.15; -- 15% VAT rate
BEGIN
    -- Clear existing payments data (optional - remove if you want to keep existing data)
    -- DELETE FROM payments_;
    
    -- Loop through all vehicles and calculate totals
    FOR vehicle_record IN 
        SELECT 
            id,
            company,
            new_account_number,
            -- Sum all rental amounts (convert text to numeric, handle nulls)
            COALESCE(NULLIF(skylink_trailer_unit_rental, '')::NUMERIC, 0) +
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
            COALESCE(NULLIF(tag_rental_, '')::NUMERIC, 0) +
            COALESCE(NULLIF(tag_reader_rental_, '')::NUMERIC, 0) +
            COALESCE(NULLIF(main_fm_harness_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(beame_1_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(beame_2_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(beame_3_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(beame_4_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(beame_5_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(single_probe_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(dual_probe_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_7m_harness_for_probe_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(tpiece_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(idata_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_1m_extension_cable_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_3m_extension_cable_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_4ch_mdvr_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_5ch_mdvr_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_8ch_mdvr_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(a2_dash_cam_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(a3_dash_cam_ai_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_5m_cable_for_camera_4pin_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_5m_cable_6pin_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_10m_cable_for_camera_4pin_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(a2_mec_5_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(vw400_dome_1_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(vw400_dome_2_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(vw300_dakkie_dome_1_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(vw300_dakkie_dome_2_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(vw502_dual_lens_camera_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(vw303_driver_facing_camera_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(vw502f_road_facing_camera_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(vw306_dvr_road_facing_for_4ch_8ch_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(vw306m_a2_dash_cam_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(dms01_driver_facing_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(adas_02_road_facing_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(vw100ip_driver_facing_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(sd_card_1tb_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(sd_card_2tb_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(sd_card_480gb_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(sd_card_256gb_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(sd_card_512gb_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(sd_card_250gb_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(mic_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(speaker_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(pfk_main_unit_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(breathaloc_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(pfk_road_facing_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(pfk_driver_facing_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(pfk_dome_1_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(pfk_dome_2_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(pfk_5m_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(pfk_10m_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(pfk_15m_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(pfk_20m_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(roller_door_switches_rental, '')::NUMERIC, 0) +
            COALESCE(NULLIF(consultancy, '')::NUMERIC, 0) +
            COALESCE(NULLIF(roaming, '')::NUMERIC, 0) +
            COALESCE(NULLIF(maintenance, '')::NUMERIC, 0) +
            COALESCE(NULLIF(after_hours, '')::NUMERIC, 0) +
            COALESCE(NULLIF(controlroom, '')::NUMERIC, 0) +
            -- Add subscription amounts
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
            COALESCE(NULLIF(single_probe_sub, '')::NUMERIC, 0) +
            COALESCE(NULLIF(dual_probe_sub, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_4ch_mdvr_sub, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_5ch_mdvr_sub, '')::NUMERIC, 0) +
            COALESCE(NULLIF(_8ch_mdvr_sub, '')::NUMERIC, 0) +
            COALESCE(NULLIF(a2_dash_cam_sub, '')::NUMERIC, 0) +
            COALESCE(NULLIF(pfk_main_unit_sub, '')::NUMERIC, 0) +
            -- Use existing totals if available
            COALESCE(total_rental_sub, 0) +
            COALESCE(total_rental, 0) +
            COALESCE(total_sub, 0) AS calculated_total
        FROM vehicles 
        WHERE new_account_number IS NOT NULL 
        AND new_account_number != ''
    LOOP
        -- Skip if no amount
        IF vehicle_record.calculated_total <= 0 THEN
            CONTINUE;
        END IF;
        
        -- Calculate VAT amounts
        total_excl_vat := vehicle_record.calculated_total;
        total_vat := total_excl_vat * vat_rate;
        total_incl_vat := total_excl_vat + total_vat;
        
        -- Insert or update payment record
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
            total_excl_vat, -- Amount excluding VAT
            total_vat, -- VAT amount (15%)
            total_incl_vat, -- Amount including VAT
            total_incl_vat, -- Due amount includes VAT
            0, -- Initially no payments made
            total_incl_vat, -- Balance due equals total amount
            'pending',
            DATE_TRUNC('month', CURRENT_DATE),
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '30 days',
            NOW(),
            'VEH-' || vehicle_record.id -- Reference to vehicle record
        )
        ON CONFLICT (cost_code) 
        DO UPDATE SET
            company = EXCLUDED.company,
            amount_excl_vat = EXCLUDED.amount_excl_vat,
            vat_amount = EXCLUDED.vat_amount,
            amount_incl_vat = EXCLUDED.amount_incl_vat,
            due_amount = EXCLUDED.due_amount,
            balance_due = EXCLUDED.due_amount - payments_.paid_amount,
            last_updated = NOW();
        
        processed := processed + 1;
        grand_total := grand_total + total_incl_vat;
    END LOOP;
    
    -- Return results
    RETURN QUERY SELECT 
        processed,
        grand_total,
        'Successfully processed ' || processed::TEXT || ' vehicles with total amount of R' || grand_total::TEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION populate_payments_from_vehicles() TO authenticated, service_role;

-- Create the trigger function for updating payment balance
CREATE OR REPLACE FUNCTION update_payment_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically calculate balance_due when paid_amount changes
    NEW.balance_due := NEW.due_amount - NEW.paid_amount;
    
    -- Update payment status based on balance
    IF NEW.balance_due <= 0 THEN
        NEW.payment_status := 'paid';
    ELSIF NEW.paid_amount > 0 AND NEW.balance_due > 0 THEN
        NEW.payment_status := 'partial';
    ELSIF CURRENT_DATE > NEW.due_date AND NEW.balance_due > 0 THEN
        NEW.payment_status := 'overdue';
    ELSE
        NEW.payment_status := 'pending';
    END IF;
    
    -- Update last_updated timestamp
    NEW.last_updated := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;