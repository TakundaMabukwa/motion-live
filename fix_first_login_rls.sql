-- Fix first_login column and RLS policies
-- This script ensures users can update their own first_login status

-- First, make sure the first_login column exists
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
UPDATE users 
SET first_login = TRUE 
WHERE first_login IS NULL;

-- Create or replace RLS policy for users to update their own first_login status
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own first_login" ON users;

-- Create new policy allowing users to update their own first_login field
CREATE POLICY "Users can update their own first_login" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Also allow users to read their own data
DROP POLICY IF EXISTS "Users can read their own data" ON users;
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Verify the column was added and policies are in place
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'first_login';

-- Show current RLS policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users';
