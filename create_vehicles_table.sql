-- Create vehicles table for VIN scanning functionality
-- This table will store vehicle information with VIN numbers

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Basic Vehicle Information
  registration_number TEXT NOT NULL,
  engine_number TEXT NOT NULL,
  vin_number TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  sub_model TEXT,
  manufactured_year INTEGER NOT NULL,
  vehicle_type TEXT NOT NULL,
  registration_date DATE NOT NULL,
  license_expiry_date DATE NOT NULL,
  
  -- Pricing Information
  purchase_price NUMERIC,
  retail_price NUMERIC,
  vehicle_priority TEXT,
  
  -- Technical Specifications
  fuel_type TEXT NOT NULL,
  transmission_type TEXT NOT NULL,
  tank_capacity NUMERIC,
  register_number TEXT,
  take_on_kilometers INTEGER,
  service_intervals_km INTEGER NOT NULL,
  boarding_km INTEGER,
  date_expected_boarding DATE,
  cost_centres TEXT[] DEFAULT '{}',
  color TEXT NOT NULL,
  
  -- Dimensions
  length_meters NUMERIC,
  width_meters NUMERIC,
  height_meters NUMERIC,
  volume NUMERIC,
  tare_weight NUMERIC,
  gross_weight NUMERIC,
  
  -- Trailer Information
  trailer_count INTEGER,
  trailer_type TEXT,
  
  -- Service Plan
  has_service_plan BOOLEAN DEFAULT false,
  is_factory_service_plan BOOLEAN,
  is_aftermarket_service_plan BOOLEAN,
  service_provider TEXT,
  service_plan_km INTEGER,
  service_plan_interval_km INTEGER,
  service_plan_start_date DATE,
  service_plan_end_date DATE,
  
  -- Maintenance Plan
  has_maintenance_plan BOOLEAN DEFAULT false,
  is_factory_maintenance_plan BOOLEAN,
  is_aftermarket_maintenance_plan BOOLEAN,
  maintenance_provider TEXT,
  maintenance_plan_km INTEGER,
  maintenance_plan_interval_km INTEGER,
  maintenance_plan_start_date DATE,
  maintenance_plan_end_date DATE,
  
  -- Insurance
  has_insurance BOOLEAN DEFAULT false,
  insurance_policy_number TEXT,
  insurance_provider TEXT,
  insurance_document_url TEXT,
  
  -- Tracking
  has_tracking BOOLEAN DEFAULT false,
  tracking_provider TEXT,
  tracking_document_url TEXT,
  
  -- Bank/Card Information
  has_card BOOLEAN DEFAULT false,
  card_type TEXT,
  bank_name TEXT,
  card_number TEXT,
  
  -- Additional Information
  company TEXT,
  group_name TEXT,
  new_registration TEXT,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Audit Fields
  created_by UUID,
  updated_by UUID
);

-- Create index on VIN number for fast searching
CREATE INDEX IF NOT EXISTS idx_vehicles_vin_number ON vehicles(vin_number);
CREATE INDEX IF NOT NOT EXISTS idx_vehicles_company ON vehicles(company);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(active);

-- Add some sample data for testing
INSERT INTO vehicles (
  registration_number,
  engine_number,
  vin_number,
  make,
  model,
  manufactured_year,
  vehicle_type,
  registration_date,
  license_expiry_date,
  fuel_type,
  transmission_type,
  service_intervals_km,
  color,
  company,
  group_name,
  new_registration
) VALUES 
(
  'LX 90 MH GP',
  'ENG123456789',
  '1HGBH41JXMN109186',
  'honda',
  'Civic',
  2020,
  'sedan',
  '2020-01-15',
  '2025-01-15',
  'petrol',
  'automatic',
  10000,
  'silver',
  'Test Company',
  'Test Group',
  'test@example.com'
),
(
  'CA 123 GP',
  'ENG987654321',
  '2T1BURHE0JC123456',
  'toyota',
  'Camry',
  2019,
  'sedan',
  '2019-06-20',
  '2024-06-20',
  'petrol',
  'automatic',
  15000,
  'black',
  'Another Company',
  'Another Group',
  'another@example.com'
);

-- Enable Row Level Security (RLS)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users" ON vehicles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON vehicles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON vehicles
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON vehicles
  FOR DELETE USING (auth.role() = 'authenticated'); 