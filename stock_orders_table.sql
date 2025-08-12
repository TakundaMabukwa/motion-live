-- Create the stock_orders table with invoice_link field
CREATE TABLE stock_orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    supplier VARCHAR(255),
    total_amount_ex_vat DECIMAL(15,2) NOT NULL,
    total_amount_usd DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- JSON field to store all order items
    order_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Field to store the invoice PDF link
    invoice_link TEXT
);

-- Index for better performance and JSON queries
CREATE INDEX idx_stock_orders_status ON stock_orders(status);
CREATE INDEX idx_stock_orders_date ON stock_orders(order_date);
CREATE INDEX idx_stock_orders_items ON stock_orders USING GIN (order_items);
CREATE INDEX idx_stock_orders_supplier ON stock_orders(supplier);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_stock_orders_updated_at 
    BEFORE UPDATE ON stock_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create the invoices bucket in Supabase Storage (run this in Supabase dashboard)
-- 1. Go to Storage in your Supabase dashboard
-- 2. Create a new bucket called 'invoices'
-- 3. Set the bucket to public or private based on your needs
-- 4. Configure RLS policies as needed

-- Example RLS policy for the stock_orders table (adjust based on your auth setup)
-- ALTER TABLE stock_orders ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view their own orders" ON stock_orders
--     FOR SELECT USING (auth.uid()::text = created_by);

-- CREATE POLICY "Users can insert their own orders" ON stock_orders
--     FOR INSERT WITH CHECK (auth.uid()::text = created_by);

-- CREATE POLICY "Users can update their own orders" ON stock_orders
--     FOR UPDATE USING (auth.uid()::text = created_by);
