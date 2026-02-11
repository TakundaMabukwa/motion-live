-- Add validation column to customers table
-- This script adds a customer_validated boolean column to track validation status

DO $$ 
BEGIN
    -- Add customer_validated column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'customer_validated'
    ) THEN
        ALTER TABLE customers ADD COLUMN customer_validated BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added customer_validated column to customers table';
    ELSE
        RAISE NOTICE 'customer_validated column already exists in customers table';
    END IF;

    -- Add validated_by column to track who validated the customer
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'validated_by'
    ) THEN
        ALTER TABLE customers ADD COLUMN validated_by TEXT;
        RAISE NOTICE 'Added validated_by column to customers table';
    ELSE
        RAISE NOTICE 'validated_by column already exists in customers table';
    END IF;

    -- Add validated_at column to track when validation occurred
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'validated_at'
    ) THEN
        ALTER TABLE customers ADD COLUMN validated_at TIMESTAMPTZ;
        RAISE NOTICE 'Added validated_at column to customers table';
    ELSE
        RAISE NOTICE 'validated_at column already exists in customers table';
    END IF;
END $$;

-- Add index for better performance on validation queries
CREATE INDEX IF NOT EXISTS idx_customers_validated ON customers(customer_validated);

-- Comment on the new columns
COMMENT ON COLUMN customers.customer_validated IS 'Boolean flag indicating if customer data has been validated';
COMMENT ON COLUMN customers.validated_by IS 'Email of the user who validated the customer data';
COMMENT ON COLUMN customers.validated_at IS 'Timestamp when customer data was validated';