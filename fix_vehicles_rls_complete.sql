-- Complete RLS Policy Fix for Vehicles Database
-- This script ensures authenticated users can access the vehicles and vehicles_ip tables

-- Step 1: Disable RLS temporarily to check table structure
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles_ip DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON vehicles;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON vehicles_ip;

-- Step 3: Create comprehensive policies for vehicles table
CREATE POLICY "Enable all access for authenticated users" ON vehicles
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 4: Create comprehensive policies for vehicles_ip table
CREATE POLICY "Enable all access for authenticated users" ON vehicles_ip
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 5: Re-enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles_ip ENABLE ROW LEVEL SECURITY;

-- Step 6: Verify policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('vehicles', 'vehicles_ip')
ORDER BY tablename, policyname;

-- Step 7: Test the policies by checking if we can read from the table
-- (This will be done by the API endpoints)

-- Step 8: Add some test data if the table is empty
DO $$
DECLARE
    vehicle_count INTEGER;
BEGIN
    -- Check if vehicles table has data
    SELECT COUNT(*) INTO vehicle_count FROM vehicles;
    
    IF vehicle_count = 0 THEN
        -- Insert test vehicles
        INSERT INTO vehicles (
            registration_number,
            engine_number,
            vin_number,
            make,
            model,
            manufactured_year,
            vehicle_type,
            registration_date,
            license_expiry_date,
            fuel_type,
            transmission_type,
            service_intervals_km,
            color,
            cost_centres
        ) VALUES 
        (
            'LX 90 MH GP',
            'ENG123456789',
            'ZFA687200000939283',
            'fiat',
            '500',
            2020,
            'hatchback',
            '2020-01-15',
            '2025-01-15',
            'petrol',
            'automatic',
            10000,
            'silver',
            ARRAY['Test Company']
        ),
        (
            'CA 123 GP',
            'ENG987654321',
            '1HGBH41JXMN109186',
            'honda',
            'civic',
            2019,
            'sedan',
            '2019-06-20',
            '2024-06-20',
            'petrol',
            'manual',
            15000,
            'black',
            ARRAY['Another Company']
        ),
        (
            'GP 456 NC',
            'ENG555666777',
            'WBAAV33421FU91768',
            'bmw',
            '3 series',
            2021,
            'sedan',
            '2021-03-10',
            '2026-03-10',
            'petrol',
            'automatic',
            12000,
            'white',
            ARRAY['Test Fleet']
        )
        ON CONFLICT (vin_number) DO NOTHING;
        
        RAISE NOTICE 'Added test vehicles to empty table';
    ELSE
        RAISE NOTICE 'Vehicles table already has % records', vehicle_count;
    END IF;
END $$;

-- Step 9: Add test data to vehicles_ip if it exists and is empty
DO $$
DECLARE
    ip_count INTEGER;
BEGIN
    -- Check if vehicles_ip table exists and has data
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicles_ip') THEN
        SELECT COUNT(*) INTO ip_count FROM vehicles_ip;
        
        IF ip_count = 0 THEN
            INSERT INTO vehicles_ip (
                new_account_number,
                company,
                group_name,
                new_registration,
                products,
                active
            ) VALUES 
            (
                'ACC001',
                'Test Company',
                'Test Company',
                'LX 90 MH GP',
                ARRAY['GPS Tracker', 'Insurance'],
                true
            ),
            (
                'ACC002',
                'Another Company',
                'Another Company',
                'CA 123 GP',
                ARRAY['GPS Tracker'],
                true
            ),
            (
                'ACC003',
                'Test Fleet',
                'Test Fleet',
                'GP 456 NC',
                ARRAY['GPS Tracker', 'Insurance', 'Maintenance Plan'],
                true
            )
            ON CONFLICT (new_account_number) DO NOTHING;
            
            RAISE NOTICE 'Added test data to vehicles_ip table';
        ELSE
            RAISE NOTICE 'Vehicles_IP table already has % records', ip_count;
        END IF;
    ELSE
        RAISE NOTICE 'Vehicles_IP table does not exist, skipping';
    END IF;
END $$;

-- Step 10: Final verification
SELECT 
    'vehicles' as table_name,
    COUNT(*) as record_count
FROM vehicles
UNION ALL
SELECT 
    'vehicles_ip' as table_name,
    COUNT(*) as record_count
FROM vehicles_ip; 