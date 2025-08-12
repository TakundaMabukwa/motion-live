-- Add QR code and IP address fields to job_cards table
-- Run this script to add the missing fields for QR code functionality

-- Add qr_code field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_cards' AND column_name = 'qr_code'
    ) THEN
        ALTER TABLE job_cards ADD COLUMN qr_code TEXT;
        RAISE NOTICE 'Added qr_code column to job_cards table';
    ELSE
        RAISE NOTICE 'qr_code column already exists in job_cards table';
    END IF;
END $$;

-- Add ip_address field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_cards' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE job_cards ADD COLUMN ip_address VARCHAR(45);
        RAISE NOTICE 'Added ip_address column to job_cards table';
    ELSE
        RAISE NOTICE 'ip_address column already exists in job_cards table';
    END IF;
END $$;

-- Verify the fields were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'job_cards' 
AND column_name IN ('qr_code', 'ip_address')
ORDER BY column_name;
