-- Fix the quotation number trigger for repair jobs
CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate quotation numbers for non-repair jobs
    IF NEW.repair = false AND (NEW.quotation_number IS NULL OR NEW.quotation_number = '') THEN
        NEW.quotation_number := generate_quotation_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Test repair job insertion
INSERT INTO job_cards (
    job_type,
    repair,
    job_description,
    priority,
    status,
    job_status,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    vehicle_registration,
    vehicle_make,
    vehicle_model,
    special_instructions,
    technician_name,
    technician_phone,
    job_date,
    start_time,
    completion_date,
    end_time,
    before_photos,
    after_photos,
    created_by,
    updated_by,
    job_number
) VALUES (
    'repair',
    true,
    'Test repair job',
    'medium',
    'completed',
    'Completed',
    'Test Customer',
    'test@example.com',
    '1234567890',
    'Test Address',
    'TEST123',
    'Toyota',
    'Camry',
    'Test instructions',
    'test@tech.com',
    'test@tech.com',
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    '["https://example.com/before1.jpg"]',
    '["https://example.com/after1.jpg"]',
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'JOB-TEST-001'
);
