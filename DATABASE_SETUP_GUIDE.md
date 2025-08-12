# 🗄️ Database Setup Guide for VIN Scanner

## 📋 Overview

This guide will help you set up the vehicles database for the VIN scanner functionality. The system requires two tables: `vehicles` and `vehicles_ip`.

## 🔧 Database Setup Steps

### **Step 1: Create Vehicles Table**

Run this SQL in your Supabase SQL editor:

```sql
-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text NOT NULL,
  engine_number text NOT NULL,
  vin_number text NOT NULL UNIQUE,
  make text NOT NULL,
  model text NOT NULL,
  sub_model text,
  manufactured_year integer NOT NULL,
  vehicle_type text NOT NULL,
  registration_date date NOT NULL,
  license_expiry_date date NOT NULL,
  purchase_price numeric,
  retail_price numeric,
  vehicle_priority text,
  fuel_type text NOT NULL,
  transmission_type text NOT NULL,
  tank_capacity numeric,
  register_number text,
  take_on_kilometers integer,
  service_intervals_km integer NOT NULL,
  boarding_km integer,
  date_expected_boarding date,
  cost_centres jsonb[] NOT NULL DEFAULT '{}',
  color text NOT NULL,
  length_meters numeric,
  width_meters numeric,
  height_meters numeric,
  volume numeric,
  tare_weight numeric,
  gross_weight numeric,
  trailer_count integer,
  trailer_type text,
  has_service_plan boolean DEFAULT false,
  is_factory_service_plan boolean,
  is_aftermarket_service_plan boolean,
  service_provider text,
  service_plan_km integer,
  service_plan_interval_km integer,
  service_plan_start_date date,
  service_plan_end_date date,
  has_maintenance_plan boolean DEFAULT false,
  is_factory_maintenance_plan boolean,
  is_aftermarket_maintenance_plan boolean,
  maintenance_provider text,
  maintenance_plan_km integer,
  maintenance_plan_interval_km integer,
  maintenance_plan_start_date date,
  maintenance_plan_end_date date,
  has_insurance boolean DEFAULT false,
  insurance_policy_number text,
  insurance_provider text,
  insurance_document_url text,
  has_tracking boolean DEFAULT false,
  tracking_provider text,
  tracking_document_url text,
  has_card boolean DEFAULT false,
  card_type text,
  bank_name text,
  card_number text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
```

### **Step 2: Create Vehicles_IP Table**

```sql
-- Create vehicles_ip table
CREATE TABLE IF NOT EXISTS vehicles_ip (
  id smallint PRIMARY KEY,
  new_account_number text NOT NULL,
  company text,
  comment text,
  group_name text,
  new_registration text,
  beame_1 text,
  beame_2 text,
  beame_3 text,
  ip_address text,
  products jsonb[] NOT NULL DEFAULT '{}',
  active boolean DEFAULT true
);
```

### **Step 3: Fix RLS Policies**

Run this SQL to fix the Row Level Security policies:

```sql
-- Fix RLS policies for vehicles table
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON vehicles;

-- Create new policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON vehicles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON vehicles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON vehicles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON vehicles
    FOR DELETE USING (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Also fix vehicles_ip table
ALTER TABLE vehicles_ip DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON vehicles_ip;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users" ON vehicles_ip
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON vehicles_ip
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON vehicles_ip
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON vehicles_ip
    FOR DELETE USING (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE vehicles_ip ENABLE ROW LEVEL SECURITY;
```

### **Step 4: Add Test Data**

Run this SQL to add test vehicles:

```sql
-- Add test vehicles
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

-- Add test data to vehicles_ip table
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
```

## 🧪 Testing the Setup

### **Test 1: Database Connection**
```bash
curl "http://localhost:3001/api/test-vehicles-db"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Vehicles database is properly configured",
  "tests": {
    "tableAccessible": true,
    "canRead": true,
    "canInsert": true,
    "sampleDataCount": 5,
    "ipTableAccessible": true
  }
}
```

### **Test 2: Vehicle Search**
```bash
curl "http://localhost:3001/api/vehicles/search?vin=1HGBH41JXMN109186&debug=true"
```

**Expected Response:**
```json
{
  "success": true,
  "vehicles": [
    {
      "id": "...",
      "registration_number": "CA 123 GP",
      "vin_number": "1HGBH41JXMN109186",
      "make": "honda",
      "model": "civic",
      "manufactured_year": 2019,
      "color": "black"
    }
  ],
  "count": 1,
  "vin": "1HGBH41JXMN109186"
}
```

### **Test 3: Vehicle Creation**
```bash
curl -X POST "http://localhost:3001/api/vehicles" \
  -H "Content-Type: application/json" \
  -d '{
    "registration_number": "TEST123",
    "vin_number": "NEW123456789",
    "make": "toyota",
    "model": "camry",
    "manufactured_year": 2024,
    "vehicle_type": "sedan",
    "registration_date": "2024-01-01",
    "license_expiry_date": "2029-01-01",
    "fuel_type": "petrol",
    "transmission_type": "automatic",
    "service_intervals_km": 10000,
    "color": "blue"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "vehicle": {
    "id": "...",
    "registration_number": "TEST123",
    "vin_number": "NEW123456789",
    "make": "toyota",
    "model": "camry"
  },
  "message": "Vehicle created successfully"
}
```

## 🔍 Troubleshooting

### **Issue 1: RLS Policy Error**
**Error:** `new row violates row-level security policy for table "vehicles"`

**Solution:** Run the RLS policy fix SQL from Step 3.

### **Issue 2: Table Not Found**
**Error:** `relation "vehicles" does not exist`

**Solution:** Run the table creation SQL from Steps 1 and 2.

### **Issue 3: Authentication Error**
**Error:** `Not authenticated`

**Solution:** Make sure you're logged into the application before testing the API.

### **Issue 4: Column Missing**
**Error:** `column "vehicles.xxx" does not exist`

**Solution:** Check that all required columns exist in the vehicles table schema.

## ✅ Verification Checklist

- [ ] Vehicles table created with all required columns
- [ ] Vehicles_IP table created
- [ ] RLS policies configured for both tables
- [ ] Test data inserted successfully
- [ ] Database connection test passes
- [ ] Vehicle search API works
- [ ] Vehicle creation API works
- [ ] VIN scanner can find existing vehicles
- [ ] VIN scanner can create new vehicles

## 🎉 Ready to Use!

Once all tests pass, the VIN scanner will be fully functional:

1. **Scan VIN barcodes** from images
2. **Search existing vehicles** in the database
3. **Create new vehicles** with complete details
4. **Link vehicles** with customer data
5. **Store data** in both tables

**Test the VIN scanner by going to any tech page and clicking "Scan Vehicle VIN"!** 🚗✨ 