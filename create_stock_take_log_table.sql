-- Create stock_take_log table for tracking stock take activities
CREATE TABLE IF NOT EXISTS stock_take_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Stock item reference
    stock_item_id UUID NOT NULL REFERENCES stock(id),
    
    -- Quantity information
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL, -- positive for increase, negative for decrease
    
    -- Stock take session information
    stock_take_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    
    -- Audit information
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional metadata
    session_id UUID, -- to group related stock take activities
    location VARCHAR(255), -- where the stock take was performed
    method VARCHAR(50) DEFAULT 'manual' -- manual, barcode, rfid, etc.
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_take_log_stock_item_id ON stock_take_log(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_log_date ON stock_take_log(stock_take_date);
CREATE INDEX IF NOT EXISTS idx_stock_take_log_performed_by ON stock_take_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_stock_take_log_session_id ON stock_take_log(session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE stock_take_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON stock_take_log
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON stock_take_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON stock_take_log
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON stock_take_log
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add trigger to update stock table's updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_stock_updated_at') THEN
        CREATE TRIGGER trigger_update_stock_updated_at
            BEFORE UPDATE ON stock
            FOR EACH ROW
            EXECUTE FUNCTION update_stock_updated_at();
    END IF;
END $$;

-- Add sample data for testing (optional)
-- INSERT INTO stock_take_log (stock_item_id, previous_quantity, new_quantity, difference, stock_take_date, notes, performed_by)
-- VALUES 
-- (
--     'stock-item-uuid-1',
--     100,
--     95,
--     -5,
--     NOW(),
--     'Monthly stock take - found 5 damaged items',
--     'user-uuid-1'
-- ),
-- (
--     'stock-item-uuid-2',
--     50,
--     52,
--     2,
--     NOW(),
--     'Monthly stock take - found 2 additional items in storage',
--     'user-uuid-1'
-- ); 