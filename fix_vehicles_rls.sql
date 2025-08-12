-- Fix RLS policies for vehicles table
-- This script enables proper access for authenticated users

-- First, disable RLS temporarily to check the table
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON vehicles;

-- Create new policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON vehicles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON vehicles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON vehicles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON vehicles
    FOR DELETE USING (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Also fix vehicles_ip table if it exists
DO $$
BEGIN
    -- Check if vehicles_ip table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicles_ip') THEN
        -- Disable RLS temporarily
        ALTER TABLE vehicles_ip DISABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON vehicles_ip;
        DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON vehicles_ip;
        DROP POLICY IF EXISTS "Enable update access for authenticated users" ON vehicles_ip;
        DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON vehicles_ip;
        
        -- Create new policies
        CREATE POLICY "Enable read access for authenticated users" ON vehicles_ip
            FOR SELECT USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable insert access for authenticated users" ON vehicles_ip
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable update access for authenticated users" ON vehicles_ip
            FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Enable delete access for authenticated users" ON vehicles_ip
            FOR DELETE USING (auth.role() = 'authenticated');
        
        -- Re-enable RLS
        ALTER TABLE vehicles_ip ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Fixed RLS policies for vehicles_ip table';
    ELSE
        RAISE NOTICE 'vehicles_ip table does not exist, skipping';
    END IF;
END $$;

-- Verify the policies are working
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