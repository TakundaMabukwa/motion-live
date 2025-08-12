-- Create purchases table to store paid stock orders
CREATE TABLE IF NOT EXISTS purchases (
    id BIGSERIAL PRIMARY KEY,
    stock_order_id BIGINT REFERENCES stock_orders(id),
    order_number VARCHAR NOT NULL,
    supplier VARCHAR,
    total_amount_ex_vat NUMERIC NOT NULL,
    total_amount_usd NUMERIC,
    order_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by VARCHAR,
    invoice_link TEXT,
    order_items JSONB,
    status VARCHAR DEFAULT 'paid',
    paid_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_purchases_stock_order_id ON purchases(stock_order_id);
CREATE INDEX IF NOT EXISTS idx_purchases_order_number ON purchases(order_number);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_paid_date ON purchases(paid_date);

-- Add RLS (Row Level Security) if needed
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view purchases
CREATE POLICY "Users can view purchases" ON purchases
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to insert purchases
CREATE POLICY "Users can insert purchases" ON purchases
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update purchases
CREATE POLICY "Users can update purchases" ON purchases
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_purchases_updated_at 
    BEFORE UPDATE ON purchases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data if needed (optional)
-- INSERT INTO purchases (stock_order_id, order_number, supplier, total_amount_ex_vat, notes, created_by, status)
-- VALUES 
--     (1, 'PO-001', 'Sample Supplier', 1500.00, 'Sample purchase order', 'admin', 'paid'),
--     (2, 'PO-002', 'Another Supplier', 2500.00, 'Another sample order', 'admin', 'paid');
