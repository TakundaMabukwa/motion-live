-- Create payments table to store payment records
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL,
    payment_reference TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint to stock_orders
    CONSTRAINT fk_payments_order_number 
        FOREIGN KEY (order_number) 
        REFERENCES stock_orders(order_number) 
        ON DELETE CASCADE,
    
    -- Ensure amount is positive
    CONSTRAINT check_amount_positive 
        CHECK (amount > 0)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_order_number ON payments(order_number);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- Add comment
COMMENT ON TABLE payments IS 'Stores payment records for stock orders';
COMMENT ON COLUMN payments.order_number IS 'Foreign key to stock_orders table';
COMMENT ON COLUMN payments.payment_reference IS 'User-provided payment reference (e.g., PO123, Invoice #456)';
COMMENT ON COLUMN payments.amount IS 'Payment amount in ZAR';
COMMENT ON COLUMN payments.payment_date IS 'When the payment was processed';
