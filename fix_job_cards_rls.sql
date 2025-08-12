-- Fix RLS policies for job_cards table
-- Enable RLS
ALTER TABLE job_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON job_cards;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON job_cards;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON job_cards;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON job_cards;

-- Create policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON job_cards
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON job_cards
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON job_cards
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON job_cards
    FOR DELETE USING (auth.role() = 'authenticated');

-- Alternative: Allow all operations for authenticated users (simpler approach)
-- CREATE POLICY "Allow all operations for authenticated users" ON job_cards
--     FOR ALL USING (auth.role() = 'authenticated'); 