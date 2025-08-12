-- Add approved column to stock_orders table
-- Run this in your Supabase SQL Editor

-- Add the approved column with a default value of false
ALTER TABLE stock_orders 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Update existing orders to be approved (you can modify this logic as needed)
-- For now, we'll set all existing orders to approved = true
UPDATE stock_orders 
SET approved = true 
WHERE approved IS NULL;

-- Create an index on the approved column for better performance
CREATE INDEX IF NOT EXISTS idx_stock_orders_approved ON stock_orders(approved);

-- Optional: Add a comment to document the column
COMMENT ON COLUMN stock_orders.approved IS 'Whether the order has been approved for processing';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'stock_orders' AND column_name = 'approved';
