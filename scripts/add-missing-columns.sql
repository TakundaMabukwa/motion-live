-- Add missing columns to vehicles table if they don't exist

-- Check if column exists before adding
DO $$ 
BEGIN
    -- Add new_account_number if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vehicles' AND column_name='new_account_number') THEN
        ALTER TABLE vehicles ADD COLUMN new_account_number TEXT;
    END IF;
    
    -- Add branch if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vehicles' AND column_name='branch') THEN
        ALTER TABLE vehicles ADD COLUMN branch TEXT;
    END IF;
    
    -- Add any other missing columns here
    -- Example:
    -- IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vehicles' AND column_name='your_column') THEN
    --     ALTER TABLE vehicles ADD COLUMN your_column TEXT;
    -- END IF;
    
END $$;