-- Add Technicians to Database
-- Run this in your Supabase SQL Editor

-- 1. Temporarily disable RLS on technicians table
ALTER TABLE technicians DISABLE ROW LEVEL SECURITY;

-- 2. Insert sample technicians
INSERT INTO technicians (id, name, email, admin) VALUES
  (gen_random_uuid(), 'John Smith', 'john.smith@company.com', true),
  (gen_random_uuid(), 'Sarah Wilson', 'sarah.wilson@company.com', false),
  (gen_random_uuid(), 'Mike Johnson', 'mike.johnson@company.com', false),
  (gen_random_uuid(), 'Tech Skyflow', 'tech.skyflow@company.com', true),
  (gen_random_uuid(), 'David Brown', 'david.brown@company.com', false),
  (gen_random_uuid(), 'Lisa Chen', 'lisa.chen@company.com', false);

-- 3. Re-enable RLS
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for technicians table
-- Policy for SELECT (all authenticated users can read)
CREATE POLICY "Allow authenticated users to read technicians" ON technicians
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for INSERT/UPDATE/DELETE (only admins can modify)
CREATE POLICY "Allow admins to modify technicians" ON technicians
  FOR ALL USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' IN (
    SELECT email FROM technicians WHERE admin = true
  ));

-- 5. Verify the technicians were added
SELECT * FROM technicians ORDER BY name; 