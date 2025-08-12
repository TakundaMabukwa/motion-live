-- Add customer contact fields to vehicles_ip table for quote auto-filling
-- This script adds the necessary fields to store customer contact information

DO $$
BEGIN
    -- Check if vehicles_ip table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicles_ip') THEN
        
        -- Add customer contact fields if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'vehicles_ip' AND column_name = 'trading_name') THEN
            ALTER TABLE vehicles_ip ADD COLUMN trading_name VARCHAR(255);
            RAISE NOTICE 'Added trading_name column to vehicles_ip table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'vehicles_ip' AND column_name = 'email') THEN
            ALTER TABLE vehicles_ip ADD COLUMN email VARCHAR(255);
            RAISE NOTICE 'Added email column to vehicles_ip table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'vehicles_ip' AND column_name = 'cell_no') THEN
            ALTER TABLE vehicles_ip ADD COLUMN cell_no VARCHAR(50);
            RAISE NOTICE 'Added cell_no column to vehicles_ip table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'vehicles_ip' AND column_name = 'switchboard') THEN
            ALTER TABLE vehicles_ip ADD COLUMN switchboard VARCHAR(50);
            RAISE NOTICE 'Added switchboard column to vehicles_ip table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'vehicles_ip' AND column_name = 'physical_address') THEN
            ALTER TABLE vehicles_ip ADD COLUMN physical_address TEXT;
            RAISE NOTICE 'Added physical_address column to vehicles_ip table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'vehicles_ip' AND column_name = 'postal_address') THEN
            ALTER TABLE vehicles_ip ADD COLUMN postal_address TEXT;
            RAISE NOTICE 'Added postal_address column to vehicles_ip table';
        END IF;
        
        -- Update existing records with sample data
        UPDATE vehicles_ip 
        SET 
            trading_name = COALESCE(trading_name, company),
            email = COALESCE(email, 'contact@' || LOWER(REPLACE(company, ' ', '')) || '.com'),
            cell_no = COALESCE(cell_no, '+27 82 123 4567'),
            switchboard = COALESCE(switchboard, '+27 11 123 4567'),
            physical_address = COALESCE(physical_address, '123 Main Street, Johannesburg, 2000'),
            postal_address = COALESCE(postal_address, 'P.O. Box 123, Johannesburg, 2000')
        WHERE trading_name IS NULL OR email IS NULL;
        
        RAISE NOTICE 'Updated existing records with sample contact information';
        
    ELSE
        RAISE NOTICE 'vehicles_ip table does not exist';
    END IF;
END $$;

-- Verify the changes
SELECT 
    new_account_number,
    company,
    trading_name,
    email,
    cell_no,
    switchboard,
    physical_address,
    postal_address
FROM vehicles_ip 
LIMIT 5;
