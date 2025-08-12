-- Add test vehicles to the vehicles table
-- This script adds sample vehicles for testing the VIN scanner

-- First, let's add some test vehicles
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
  cost_centres
) VALUES 
(
  'LX 90 MH GP',
  'ENG123456789',
  'ZFA687200000939283',
  'fiat',
  '500',
  2020,
  'hatchback',
  '2020-01-15',
  '2025-01-15',
  'petrol',
  'automatic',
  10000,
  'silver',
  ARRAY['Test Company']
),
(
  'CA 123 GP',
  'ENG987654321',
  '1HGBH41JXMN109186',
  'honda',
  'civic',
  2019,
  'sedan',
  '2019-06-20',
  '2024-06-20',
  'petrol',
  'manual',
  15000,
  'black',
  ARRAY['Another Company']
),
(
  'GP 456 NC',
  'ENG555666777',
  'WBAAV33421FU91768',
  'bmw',
  '3 series',
  2021,
  'sedan',
  '2021-03-10',
  '2026-03-10',
  'petrol',
  'automatic',
  12000,
  'white',
  ARRAY['Test Fleet']
),
(
  'NC 789 GP',
  'ENG111222333',
  'WBAVB13506PT12345',
  'bmw',
  '5 series',
  2022,
  'sedan',
  '2022-08-15',
  '2027-08-15',
  'diesel',
  'automatic',
  15000,
  'blue',
  ARRAY['Premium Fleet']
),
(
  'GP 321 NC',
  'ENG444555666',
  'WDDNG7JB0FA123456',
  'mercedes',
  'c-class',
  2020,
  'sedan',
  '2020-11-30',
  '2025-11-30',
  'petrol',
  'automatic',
  10000,
  'silver',
  ARRAY['Luxury Fleet']
)
ON CONFLICT (vin_number) DO NOTHING;

-- Also add some entries to vehicles_ip table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicles_ip') THEN
        INSERT INTO vehicles_ip (
            new_account_number,
            company,
            group_name,
            new_registration,
            products,
            active
        ) VALUES 
        (
            'ACC001',
            'Test Company',
            'Test Company',
            'LX 90 MH GP',
            ARRAY['GPS Tracker', 'Insurance'],
            true
        ),
        (
            'ACC002',
            'Another Company',
            'Another Company',
            'CA 123 GP',
            ARRAY['GPS Tracker'],
            true
        ),
        (
            'ACC003',
            'Test Fleet',
            'Test Fleet',
            'GP 456 NC',
            ARRAY['GPS Tracker', 'Insurance', 'Maintenance Plan'],
            true
        )
        ON CONFLICT (new_account_number) DO NOTHING;
        
        RAISE NOTICE 'Added test data to vehicles_ip table';
    ELSE
        RAISE NOTICE 'vehicles_ip table does not exist, skipping';
    END IF;
END $$;

-- Verify the data was added
SELECT 
    registration_number,
    vin_number,
    make,
    model,
    manufactured_year,
    color
FROM vehicles 
WHERE vin_number IN (
    'ZFA687200000939283',
    '1HGBH41JXMN109186',
    'WBAAV33421FU91768',
    'WBAVB13506PT12345',
    'WDDNG7JB0FA123456'
)
ORDER BY registration_number; 