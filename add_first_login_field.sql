-- Add first_login field to users table
-- This field tracks if a user has logged in for the first time and needs to change their password

-- Add the first_login column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'first_login'
    ) THEN
        ALTER TABLE users ADD COLUMN first_login BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Update existing users to have first_login = true by default
-- This ensures all existing users will be prompted to change their password on next login
UPDATE users 
SET first_login = TRUE 
WHERE first_login IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'first_login';
