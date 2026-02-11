-- Add deinstall_vehicles and deinstall_stock_items columns to client_quotes table
ALTER TABLE client_quotes 
ADD COLUMN IF NOT EXISTS deinstall_vehicles JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS deinstall_stock_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stock_received BOOLEAN DEFAULT false;

-- Add comment to explain the columns
COMMENT ON COLUMN client_quotes.deinstall_vehicles IS 'Array of vehicle objects for deinstall jobs with full vehicle details';
COMMENT ON COLUMN client_quotes.deinstall_stock_items IS 'Array of stock items being deinstalled';
COMMENT ON COLUMN client_quotes.stock_received IS 'Whether stock has been received for deinstall jobs';
