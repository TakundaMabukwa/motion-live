-- Add color_code field to technicians table
-- Run this in your Supabase SQL Editor

-- 1. Add color_code column to technicians table
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS color_code TEXT DEFAULT '#6B7280';

-- 2. Update existing technicians with distinct colors
UPDATE technicians SET color_code = '#3B82F6' WHERE name = 'John Smith'; -- Blue
UPDATE technicians SET color_code = '#10B981' WHERE name = 'Sarah Wilson'; -- Green
UPDATE technicians SET color_code = '#F59E0B' WHERE name = 'Mike Johnson'; -- Amber
UPDATE technicians SET color_code = '#8B5CF6' WHERE name = 'Tech Skyflow'; -- Purple
UPDATE technicians SET color_code = '#EF4444' WHERE name = 'David Brown'; -- Red
UPDATE technicians SET color_code = '#06B6D4' WHERE name = 'Lisa Chen'; -- Cyan

-- 3. Verify the colors were added
SELECT name, email, admin, color_code FROM technicians ORDER BY name;

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_technicians_color_code ON technicians(color_code);
