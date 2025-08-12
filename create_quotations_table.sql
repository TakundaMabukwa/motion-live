-- Create quotations table with comprehensive pricing data in a single table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic quote information
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    quote_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
    
    -- Job details
    job_type VARCHAR(20) NOT NULL, -- 'install', 'deinstall'
    job_description TEXT,
    purchase_type VARCHAR(20) NOT NULL, -- 'purchase', 'rental'
    
    -- Customer information (for external quotes)
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    
    -- Account information (for internal quotes)
    account_id UUID REFERENCES customers(id),
    company_name VARCHAR(255),
    
    -- Quote totals
    subtotal DECIMAL(12,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Email details
    email_subject VARCHAR(255),
    email_body TEXT,
    quote_footer TEXT,
    extra_notes TEXT,
    
    -- Products data as JSON array
    products JSONB DEFAULT '[]',
    
    -- Quote type
    quote_type VARCHAR(20) DEFAULT 'external', -- 'external', 'internal'
    
    -- Additional fields
    terms_conditions TEXT,
    payment_terms VARCHAR(255),
    delivery_time VARCHAR(255),
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotations_quote_number ON quotations(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at);
CREATE INDEX IF NOT EXISTS idx_quotations_account_id ON quotations(account_id);
CREATE INDEX IF NOT EXISTS idx_quotations_quote_type ON quotations(quote_type);
CREATE INDEX IF NOT EXISTS idx_quotations_products ON quotations USING GIN(products);

-- Enable Row Level Security
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read quotations" ON quotations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert quotations" ON quotations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update quotations" ON quotations
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete quotations" ON quotations
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_number INTEGER;
    quote_number VARCHAR(50);
BEGIN
    -- Get the next number
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_number
    FROM quotations
    WHERE quote_number LIKE 'QT-%';
    
    -- Format: QT-YYYYMMDD-XXXX (e.g., QT-20241201-0001)
    quote_number := 'QT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN quote_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate quote numbers
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
        NEW.quote_number := generate_quote_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_quote_number
    BEFORE INSERT ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION set_quote_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate quotation totals from products JSON
CREATE OR REPLACE FUNCTION calculate_quotation_totals_from_json()
RETURNS TRIGGER AS $$
DECLARE
    total_subtotal DECIMAL(12,2) := 0;
    vat_rate DECIMAL(5,2) := 0.15; -- 15% VAT
    product_total DECIMAL(12,2);
    product_json JSONB;
BEGIN
    -- Calculate subtotal from products JSON array
    IF NEW.products IS NOT NULL AND jsonb_array_length(NEW.products) > 0 THEN
        FOR product_json IN SELECT * FROM jsonb_array_elements(NEW.products)
        LOOP
            product_total := COALESCE((product_json->>'product_total')::DECIMAL(12,2), 0);
            total_subtotal := total_subtotal + product_total;
        END LOOP;
    END IF;
    
    -- Update totals
    NEW.subtotal := total_subtotal;
    NEW.vat_amount := total_subtotal * vat_rate;
    NEW.total_amount := total_subtotal * (1 + vat_rate);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to calculate totals when products change
CREATE TRIGGER trigger_calculate_quotation_totals_from_json
    BEFORE INSERT OR UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_quotation_totals_from_json();

-- Example of how the products JSON structure should look:
/*
{
  "id": "product-uuid",
  "name": "Skylink Asset (Trailer)",
  "description": "Telematics Unit with Accelerometer and 4x inputs for Trailers",
  "type": "FMS",
  "category": "HARDWARE",
  "quantity": 1,
  "purchase_type": "purchase",
  "cash_price": 4649.00,
  "cash_discount": 0.00,
  "cash_gross_amount": 4649.00,
  "cash_total_amount": 4649.00,
  "rental_price": 182.00,
  "rental_discount": 0.00,
  "rental_gross_amount": 182.00,
  "rental_total_amount": 182.00,
  "installation_price": 550.00,
  "installation_discount": 0.00,
  "installation_gross_amount": 550.00,
  "installation_total_amount": 550.00,
  "de_installation_price": 550.00,
  "de_installation_discount": 0.00,
  "de_installation_gross_amount": 550.00,
  "de_installation_total_amount": 550.00,
  "subscription_price": 299.00,
  "subscription_discount": 0.00,
  "subscription_gross_amount": 299.00,
  "subscription_total_amount": 299.00,
  "product_total": 5199.00
}
*/ 