-- Create comprehensive job_cards table that includes both job and quotation details
CREATE TABLE IF NOT EXISTS job_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic job information
    job_number VARCHAR(50) UNIQUE NOT NULL,
    job_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled, on_hold
    
    -- Job details
    job_type VARCHAR(20) NOT NULL, -- 'install', 'deinstall', 'maintenance', 'repair'
    job_description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    
    -- Customer/Account information
    account_id UUID,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    
    -- Vehicle information
    vehicle_id UUID,
    vehicle_registration VARCHAR(50),
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    
    -- Technician information
    assigned_technician_id UUID,
    technician_name VARCHAR(255),
    technician_phone VARCHAR(50),
    
    -- Location information
    job_location VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Products, parts and equipment
    products_required JSONB DEFAULT '[]',
    parts_required JSONB DEFAULT '[]',
    equipment_used JSONB DEFAULT '[]',
    
    -- Job specifications
    estimated_duration_hours INTEGER,
    actual_duration_hours INTEGER,
    estimated_cost DECIMAL(12,2) DEFAULT 0,
    actual_cost DECIMAL(12,2) DEFAULT 0,
    
    -- Job progress
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    work_notes TEXT,
    completion_notes TEXT,
    job_status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed, on_hold, cancelled
    
    -- Quality and safety
    safety_checklist_completed BOOLEAN DEFAULT FALSE,
    quality_check_passed BOOLEAN DEFAULT FALSE,
    customer_signature_obtained BOOLEAN DEFAULT FALSE,
    
    -- Photos and documentation
    before_photos JSONB DEFAULT '[]',
    after_photos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    
    -- Customer feedback
    customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
    customer_feedback TEXT,
    
    -- Quotation details
    quotation_number VARCHAR(50),
    quote_date TIMESTAMP WITH TIME ZONE,
    quote_expiry_date TIMESTAMP WITH TIME ZONE,
    quote_status VARCHAR(20) DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
    
    -- Purchase and job type for quotation
    purchase_type VARCHAR(20), -- 'purchase', 'rental'
    quotation_job_type VARCHAR(20), -- 'install', 'deinstall'
    
    -- Quotation pricing breakdown
    quotation_products JSONB DEFAULT '[]', -- Detailed product pricing with discounts
    quotation_subtotal DECIMAL(12,2) DEFAULT 0,
    quotation_vat_amount DECIMAL(12,2) DEFAULT 0,
    quotation_total_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Quotation email details
    quote_email_subject VARCHAR(255),
    quote_email_body TEXT,
    quote_email_footer TEXT,
    quote_notes TEXT,
    
    -- Quotation type (external vs internal)
    quote_type VARCHAR(20) DEFAULT 'external', -- 'external', 'internal'
    
    -- Additional fields
    special_instructions TEXT,
    access_requirements TEXT,
    
    -- QR Code and IP Address for parts assignment
    qr_code TEXT,
    ip_address VARCHAR(45),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_cards_job_number ON job_cards(job_number);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_job_type ON job_cards(job_type);
CREATE INDEX IF NOT EXISTS idx_job_cards_priority ON job_cards(priority);
CREATE INDEX IF NOT EXISTS idx_job_cards_job_date ON job_cards(job_date);
CREATE INDEX IF NOT EXISTS idx_job_cards_due_date ON job_cards(due_date);
CREATE INDEX IF NOT EXISTS idx_job_cards_account_id ON job_cards(account_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_vehicle_id ON job_cards(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_assigned_technician_id ON job_cards(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_quotation_number ON job_cards(quotation_number);
CREATE INDEX IF NOT EXISTS idx_job_cards_quote_status ON job_cards(quote_status);
CREATE INDEX IF NOT EXISTS idx_job_cards_products_required ON job_cards USING GIN(products_required);
CREATE INDEX IF NOT EXISTS idx_job_cards_parts_required ON job_cards USING GIN(parts_required);
CREATE INDEX IF NOT EXISTS idx_job_cards_equipment_used ON job_cards USING GIN(equipment_used);
CREATE INDEX IF NOT EXISTS idx_job_cards_quotation_products ON job_cards USING GIN(quotation_products);

-- Create function to generate job numbers
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_number INTEGER;
    job_number VARCHAR(50);
BEGIN
    -- Get the next number
    SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_number
    FROM job_cards
    WHERE job_number LIKE 'JC-%';
    
    -- Format: JC-YYYYMMDD-XXXX (e.g., JC-20241201-0001)
    job_number := 'JC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN job_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate quotation numbers
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_number INTEGER;
    quotation_number VARCHAR(50);
BEGIN
    -- Get the next number
    SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_number
    FROM job_cards
    WHERE quotation_number LIKE 'QT-%';
    
    -- Format: QT-YYYYMMDD-XXXX (e.g., QT-20241201-0001)
    quotation_number := 'QT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN quotation_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate job numbers
CREATE OR REPLACE FUNCTION set_job_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
        NEW.job_number := generate_job_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate quotation numbers (only for non-repair jobs)
CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate quotation numbers for non-repair jobs
    IF NEW.repair = false AND (NEW.quotation_number IS NULL OR NEW.quotation_number = '') THEN
        NEW.quotation_number := generate_quotation_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_job_number
    BEFORE INSERT ON job_cards
    FOR EACH ROW
    EXECUTE FUNCTION set_job_number();

CREATE TRIGGER trigger_set_quotation_number
    BEFORE INSERT ON job_cards
    FOR EACH ROW
    EXECUTE FUNCTION set_quotation_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_job_cards_updated_at
    BEFORE UPDATE ON job_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_job_cards_updated_at();

-- Create function to calculate job duration
CREATE OR REPLACE FUNCTION calculate_job_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate actual duration if both start and end times are set
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        NEW.actual_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
    END IF;
    
    -- Set completion date when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completion_date = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to calculate job duration
CREATE TRIGGER trigger_calculate_job_duration
    BEFORE UPDATE ON job_cards
    FOR EACH ROW
    EXECUTE FUNCTION calculate_job_duration();

-- Example of how the products_required JSON structure should look:
/*
[
  {
    "id": "product-uuid",
    "name": "Skylink Asset (Trailer)",
    "quantity": 1,
    "status": "installed", // installed, pending, failed
    "serial_number": "SN123456789",
    "installation_notes": "Installed on trailer rear"
  }
]
*/

-- Example of how the parts_required JSON structure should look:
/*
[
  {
    "id": "part-uuid",
    "name": "Cable Connector",
    "part_number": "CC-001",
    "quantity": 2,
    "status": "installed", // installed, pending, failed, not_available
    "serial_number": "SN987654321",
    "installation_notes": "Installed on cable termination",
    "cost": 150.00,
    "supplier": "CableCo"
  }
]
*/

-- Example of how the quotation_products JSON structure should look:
/*
[
  {
    "id": "product-uuid",
    "name": "Skylink Asset (Trailer)",
    "description": "GPS tracking device for trailers",
    "type": "GPS Device",
    "category": "Tracking Equipment",
    "quantity": 1,
    "purchase_type": "purchase", // purchase or rental
    "cash_price": 2500.00,
    "cash_discount": 250.00,
    "cash_gross": 2250.00,
    "rental_price": 500.00,
    "rental_discount": 50.00,
    "rental_gross": 450.00,
    "installation_price": 300.00,
    "installation_discount": 0,
    "installation_gross": 300.00,
    "de_installation_price": 200.00,
    "de_installation_discount": 0,
    "de_installation_gross": 200.00,
    "subscription_price": 150.00,
    "subscription_discount": 0,
    "subscription_gross": 150.00,
    "total_price": 2700.00
  }
]
*/

-- Example of how the equipment_used JSON structure should look:
/*
[
  {
    "id": "equipment-uuid",
    "name": "Crimping Tool",
    "quantity": 1,
    "returned": true,
    "notes": "Used for cable termination"
  }
]
*/

-- Example of how the before_photos/after_photos JSON structure should look:
/*
[
  {
    "id": "photo-uuid",
    "file_name": "before_installation_001.jpg",
    "file_path": "/uploads/job_cards/job-uuid/before_installation_001.jpg",
    "file_size": 2048576,
    "uploaded_at": "2024-12-01T10:00:00Z",
    "description": "Vehicle dashboard before installation"
  }
]
*/ 