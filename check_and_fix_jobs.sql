-- Check and fix jobs for schedule display
-- Run this in your Supabase SQL Editor

-- 1. Check current state of job_cards table
SELECT 
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN job_date IS NOT NULL THEN 1 END) as jobs_with_dates,
    COUNT(CASE WHEN technician_name IS NOT NULL AND technician_name != '' THEN 1 END) as jobs_with_technicians,
    COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as jobs_with_status
FROM job_cards;

-- 2. Check current state of technicians table
SELECT 
    COUNT(*) as total_technicians,
    COUNT(CASE WHEN color_code IS NOT NULL THEN 1 END) as technicians_with_colors
FROM technicians;

-- 3. Show sample jobs
SELECT 
    id,
    job_number,
    job_date,
    technician_name,
    status,
    job_type,
    customer_name
FROM job_cards 
WHERE job_date IS NOT NULL 
ORDER BY job_date DESC 
LIMIT 10;

-- 4. Show technicians with their colors
SELECT 
    id,
    name,
    email,
    color_code
FROM technicians 
ORDER BY name;

-- 5. Check if there are any jobs that could be displayed
SELECT 
    jc.id,
    jc.job_number,
    jc.job_date,
    jc.technician_name,
    jc.status,
    jc.customer_name,
    t.color_code
FROM job_cards jc
LEFT JOIN technicians t ON jc.technician_name = t.name
WHERE jc.job_date IS NOT NULL
ORDER BY jc.job_date DESC
LIMIT 10;

-- 6. If no jobs exist, create some sample jobs for testing
-- Uncomment the following section if you need sample data

/*
INSERT INTO job_cards (
    job_number,
    job_date,
    status,
    job_type,
    job_description,
    priority,
    customer_name,
    customer_email,
    customer_phone,
    technician_name,
    technician_phone,
    job_location,
    estimated_duration_hours,
    created_at,
    updated_at
) VALUES 
(
    'JC-20241201-0001',
    '2024-12-01 09:00:00+00',
    'assigned',
    'install',
    'Install tracking device on delivery truck',
    'medium',
    'ABC Transport',
    'contact@abctransport.com',
    '+27123456789',
    'Evert',
    'Evert@soltrack.co.za',
    '123 Main St, Johannesburg',
    4,
    NOW(),
    NOW()
),
(
    'JC-20241201-0002',
    '2024-12-01 14:00:00+00',
    'assigned',
    'maintenance',
    'Maintenance check on fleet vehicles',
    'high',
    'XYZ Logistics',
    'info@xyzlogistics.com',
    '+27123456788',
    'Justin',
    'Justin@soltrack.co.za',
    '456 Business Ave, Cape Town',
    3,
    NOW(),
    NOW()
),
(
    'JC-20241202-0001',
    '2024-12-02 10:00:00+00',
    'assigned',
    'install',
    'Install GPS tracker on new vehicle',
    'medium',
    'Fast Freight',
    'service@fastfreight.co.za',
    '+27123456787',
    'Charl',
    'charl@soltrack.co.za',
    '789 Industrial Rd, Durban',
    5,
    NOW(),
    NOW()
);
*/

-- 7. After creating sample jobs, verify they exist
-- SELECT 
--     jc.id,
--     jc.job_number,
--     jc.job_date,
--     jc.technician_name,
--     jc.status,
--     jc.customer_name,
--     t.color_code
-- FROM job_cards jc
-- LEFT JOIN technicians t ON jc.technician_name = t.name
-- WHERE jc.job_date IS NOT NULL
-- ORDER BY jc.job_date DESC;
