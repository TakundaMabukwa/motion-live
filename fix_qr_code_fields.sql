-- Fix QR Code Fields for Job Cards
-- Run this in your Supabase SQL Editor

-- Add qr_code field if it doesn't exist
ALTER TABLE job_cards 
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Add ip_address field if it doesn't exist  
ALTER TABLE job_cards 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Verify the fields were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'job_cards' 
AND column_name IN ('qr_code', 'ip_address')
ORDER BY column_name;
