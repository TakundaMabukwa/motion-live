-- Add test vehicles with different VIN formats
-- This will test the flexible VIN validation

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
-- Standard 17-character VIN
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
  ARRAY['Test Company']
),
-- ZFA format VIN
(
  'CA 123 GP',
  'ENG987654321',
  'ZFA687200000939283',
  'fiat',
  '500',
  2019,
  'hatchback',
  '2019-06-20',
  '2024-06-20',
  'petrol',
  'manual',
  15000,
  'black',
  ARRAY['Another Company']
),
-- Toyota VIN format
(
  'GP 456 NC',
  'ENG555666777',
  '2T1BURHE0JC123456',
  'toyota',
  'Camry',
  2021,
  'sedan',
  '2021-03-10',
  '2026-03-10',
  'diesel',
  'automatic',
  12000,
  'white',
  ARRAY['Test Fleet']
),
-- BMW VIN format
(
  'NC 789 GP',
  'ENG111222333',
  'WBA8E9G50JNT12345',
  'bmw',
  'X5',
  2018,
  'suv',
  '2018-11-05',
  '2023-11-05',
  'diesel',
  'automatic',
  20000,
  'blue',
  ARRAY['Luxury Fleet']
),
-- Mercedes VIN format
(
  'GP 321 NC',
  'ENG444555666',
  'WDDNG7JB0FA123456',
  'mercedes',
  'C-Class',
  2022,
  'sedan',
  '2022-07-15',
  '2027-07-15',
  'petrol',
  'automatic',
  15000,
  'red',
  ARRAY['Premium Fleet']
),
-- Ford VIN format
(
  'NC 654 GP',
  'ENG777888999',
  '1FADP3F22FL123456',
  'ford',
  'Focus',
  2021,
  'hatchback',
  '2021-09-12',
  '2026-09-12',
  'petrol',
  'manual',
  10000,
  'gray',
  ARRAY['Economy Fleet']
),
-- Volkswagen VIN format
(
  'GP 987 NC',
  'ENG111333555',
  '3VWDX7AJ5DM123456',
  'volkswagen',
  'Golf',
  2020,
  'hatchback',
  '2020-05-20',
  '2025-05-20',
  'diesel',
  'automatic',
  15000,
  'green',
  ARRAY['European Fleet']
),
-- Custom format (shorter VIN)
(
  'NC 111 GP',
  'ENG999000111',
  'ABC123456789',
  'custom',
  'Special',
  2023,
  'utility',
  '2023-01-01',
  '2028-01-01',
  'electric',
  'automatic',
  8000,
  'yellow',
  ARRAY['Custom Fleet']
); 