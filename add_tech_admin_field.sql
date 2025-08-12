-- Add tech_admin field to users table
-- This field determines if a technician can see all jobs or only their assigned jobs

-- Add the tech_admin column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'tech_admin'
    ) THEN
        ALTER TABLE users ADD COLUMN tech_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update existing tech users to have tech_admin = false by default
UPDATE users 
SET tech_admin = FALSE 
WHERE role = 'tech' AND tech_admin IS NULL;

-- Example: Set a specific user as tech admin (replace 'user@example.com' with actual email)
-- UPDATE users SET tech_admin = TRUE WHERE email = 'user@example.com' AND role = 'tech';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'tech_admin';





