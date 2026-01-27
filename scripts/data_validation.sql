-- Data Validation and Correction Script
-- This script identifies and fixes common data accuracy issues

-- 1. Create validation function to check data quality
CREATE OR REPLACE FUNCTION validate_vehicle_data()
RETURNS TABLE (
    issue_type TEXT,
    vehicle_id INTEGER,
    company TEXT,
    account_number TEXT,
    issue_description TEXT,
    suggested_fix TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check for invalid numeric values
    RETURN QUERY
    SELECT 
        'INVALID_NUMERIC'::TEXT,
        id,
        company,
        new_account_number,
        'Non-numeric value in rental field'::TEXT,
        'Convert to 0 or correct value'::TEXT
    FROM vehicles 
    WHERE new_account_number IS NOT NULL 
    AND (
        -- Check if any rental field contains invalid data
        skylink_trailer_unit_rental ~ '[^0-9.]' OR
        sky_on_batt_ign_rental ~ '[^0-9.]' OR
        maintenance ~ '[^0-9.]'
    );

    -- Check for duplicate account numbers
    RETURN QUERY
    SELECT 
        'DUPLICATE_ACCOUNT'::TEXT,
        v1.id,
        v1.company,
        v1.new_account_number,
        'Duplicate account number found'::TEXT,
        'Review and consolidate or update account number'::TEXT
    FROM vehicles v1
    JOIN vehicles v2 ON v1.new_account_number = v2.new_account_number 
    WHERE v1.id != v2.id 
    AND v1.new_account_number IS NOT NULL;

    -- Check for missing company names
    RETURN QUERY
    SELECT 
        'MISSING_COMPANY'::TEXT,
        id,
        COALESCE(company, 'NULL'),
        new_account_number,
        'Company name is missing'::TEXT,
        'Add company name'::TEXT
    FROM vehicles 
    WHERE new_account_number IS NOT NULL 
    AND (company IS NULL OR company = '');

    -- Check for unrealistic amounts (too high or negative)
    RETURN QUERY
    SELECT 
        'UNREALISTIC_AMOUNT'::TEXT,
        id,
        company,
        new_account_number,
        'Amount seems unrealistic'::TEXT,
        'Verify amount is correct'::TEXT
    FROM vehicles 
    WHERE new_account_number IS NOT NULL 
    AND (
        COALESCE(NULLIF(maintenance, '')::NUMERIC, 0) > 50000 OR
        COALESCE(NULLIF(maintenance, '')::NUMERIC, 0) < 0
    );
END;
$$;

-- 2. Create data cleaning function
CREATE OR REPLACE FUNCTION clean_vehicle_data()
RETURNS TABLE (
    cleaned_count INTEGER,
    message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    clean_count INTEGER := 0;
BEGIN
    -- Clean numeric fields - remove non-numeric characters
    UPDATE vehicles 
    SET 
        skylink_trailer_unit_rental = CASE 
            WHEN skylink_trailer_unit_rental ~ '^[0-9.]+$' THEN skylink_trailer_unit_rental
            ELSE '0'
        END,
        sky_on_batt_ign_rental = CASE 
            WHEN sky_on_batt_ign_rental ~ '^[0-9.]+$' THEN sky_on_batt_ign_rental
            ELSE '0'
        END,
        maintenance = CASE 
            WHEN maintenance ~ '^[0-9.]+$' THEN maintenance
            ELSE '0'
        END
    WHERE new_account_number IS NOT NULL;
    
    GET DIAGNOSTICS clean_count = ROW_COUNT;
    
    -- Trim whitespace from text fields
    UPDATE vehicles 
    SET 
        company = TRIM(company),
        new_account_number = TRIM(new_account_number)
    WHERE new_account_number IS NOT NULL;
    
    RETURN QUERY SELECT clean_count, 'Data cleaning completed'::TEXT;
END;
$$;

-- 3. Enhanced populate function with validation
CREATE OR REPLACE FUNCTION populate_payments_from_vehicles_safe()
RETURNS TABLE (
    processed_count INTEGER,
    total_amount NUMERIC,
    validation_errors INTEGER,
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
    error_count INTEGER := 0;
    vat_rate NUMERIC := 0.15;
BEGIN
    -- First validate data
    SELECT COUNT(*) INTO error_count 
    FROM validate_vehicle_data();
    
    IF error_count > 0 THEN
        RETURN QUERY SELECT 0, 0::NUMERIC, error_count, 
            'Data validation failed. Run validate_vehicle_data() to see issues'::TEXT;
        RETURN;
    END IF;
    
    -- Process vehicles with enhanced validation
    FOR vehicle_record IN 
        SELECT 
            id,
            company,
            new_account_number,
            -- Safe numeric conversion with validation
            GREATEST(0, 
                COALESCE(CASE WHEN skylink_trailer_unit_rental ~ '^[0-9.]+$' 
                         THEN skylink_trailer_unit_rental::NUMERIC ELSE 0 END, 0) +
                COALESCE(CASE WHEN sky_on_batt_ign_rental ~ '^[0-9.]+$' 
                         THEN sky_on_batt_ign_rental::NUMERIC ELSE 0 END, 0) +
                COALESCE(CASE WHEN maintenance ~ '^[0-9.]+$' 
                         THEN maintenance::NUMERIC ELSE 0 END, 0) +
                COALESCE(total_rental, 0) +
                COALESCE(total_sub, 0)
            ) AS calculated_total
        FROM vehicles 
        WHERE new_account_number IS NOT NULL 
        AND new_account_number != ''
        AND company IS NOT NULL 
        AND company != ''
    LOOP
        -- Skip if no amount or invalid data
        IF vehicle_record.calculated_total <= 0 OR vehicle_record.calculated_total > 100000 THEN
            CONTINUE;
        END IF;
        
        -- Calculate VAT amounts
        total_excl_vat := vehicle_record.calculated_total;
        total_vat := total_excl_vat * vat_rate;
        total_incl_vat := total_excl_vat + total_vat;
        
        -- Check for existing record to prevent duplicates
        IF NOT EXISTS (
            SELECT 1 FROM payments_ 
            WHERE cost_code = vehicle_record.new_account_number 
            AND billing_month = DATE_TRUNC('month', CURRENT_DATE)
        ) THEN
            -- Insert payment record
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
                'AUTO_GENERATED_' || vehicle_record.id
            );
            
            processed := processed + 1;
            grand_total := grand_total + total_incl_vat;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT processed, grand_total, 0, 
        'Successfully processed ' || processed || ' records'::TEXT;
END;
$$;