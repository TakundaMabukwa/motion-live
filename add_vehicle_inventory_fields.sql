-- Add vehicle inventory tracking fields to job_cards table
-- This tracks when vehicles are added to inventory after job completion

-- Add the vehicle_added_to_inventory column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_cards' AND column_name = 'vehicle_added_to_inventory'
    ) THEN
        ALTER TABLE job_cards ADD COLUMN vehicle_added_to_inventory BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add the vehicle_added_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_cards' AND column_name = 'vehicle_added_at'
    ) THEN
        ALTER TABLE job_cards ADD COLUMN vehicle_added_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update existing completed jobs to have vehicle_added_to_inventory = false by default
UPDATE job_cards 
SET vehicle_added_to_inventory = FALSE 
WHERE vehicle_added_to_inventory IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'job_cards' 
AND column_name IN ('vehicle_added_to_inventory', 'vehicle_added_at');
