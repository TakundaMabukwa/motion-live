-- Test script to verify first_login update functionality
-- Run this in your Supabase SQL Editor to test the update

-- First, let's see the current state of users
SELECT id, email, first_login, role 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Test updating a specific user's first_login (replace with actual user ID)
-- You can get the user ID from the auth.users table
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Example update (replace 'user-id-here' with actual user ID):
-- UPDATE users SET first_login = false WHERE id = 'user-id-here';

-- Verify the update worked
-- SELECT id, email, first_login, role FROM users WHERE id = 'user-id-here';

