# VIN Scanner Setup Guide

## 🚨 Current Issue

The VIN scanner is not working because the `vehicles` table doesn't exist in your database yet. The current `vehicles_ip` table is for inventory tracking, not vehicle details.

## ✅ Solution

### Step 1: Create the Vehicles Table

Run the following SQL in your Supabase database to create the proper vehicles table:

```sql
-- Create vehicles table for VIN scanning functionality
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
  
  -- Technical Specifications
  fuel_type TEXT NOT NULL,
  transmission_type TEXT NOT NULL,
  service_intervals_km INTEGER NOT NULL,
  color TEXT NOT NULL,
  
  -- Additional Information
  company TEXT,
  group_name TEXT,
  new_registration TEXT
);

-- Create index on VIN number for fast searching
CREATE INDEX IF NOT EXISTS idx_vehicles_vin_number ON vehicles(vin_number);
```

### Step 2: Add Sample Data (Optional)

Add some test vehicles to test the VIN scanner:

```sql
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
);
```

### Step 3: Test the VIN Scanner

1. **Go to a technician page** (e.g., `/protected/tech/job`)
2. **Click on a job** to open the job details
3. **Click "Scan VIN"** button
4. **Enter a VIN number** (e.g., `1HGBH41JXMN109186`)
5. **Click "Search"** - it should find the vehicle

## 🔧 Features Available

### ✅ Working Features
- **VIN Validation**: Checks for 17 characters and valid characters
- **Manual Entry**: Enter VIN manually if scanner not available
- **New Vehicle Form**: Add new vehicles when not found
- **Customer Data Pre-fill**: Uses job customer data for new vehicles
- **Error Handling**: Shows helpful error messages

### 📱 Mobile Features (When Cordova Plugin Installed)
- **GMV Barcode Scanner**: High-performance VIN scanning
- **Driver's License Scanning**: PDF417 barcode scanning
- **VIN Validation**: Built-in VIN checksum validation
- **Camera Integration**: Direct camera access for scanning

## 🚀 Quick Test

1. **Open the app** in your browser
2. **Navigate to** `/protected/tech/job`
3. **Click on any job** to see job details
4. **Click "Scan VIN"** button
5. **Enter this test VIN**: `1HGBH41JXMN109186`
6. **Click "Search"** - should find the Honda Civic

## 📋 Troubleshooting

### Issue: "Vehicle search failed"
**Solution**: Run the SQL script above to create the vehicles table

### Issue: "Scanner not available"
**Solution**: This is normal in web browsers. Use manual entry or install the Cordova plugin for mobile

### Issue: "Invalid VIN format"
**Solution**: VIN must be exactly 17 characters with valid characters (A-H, J-N, P-Z, 0-9)

### Issue: "No vehicles found"
**Solution**: Add some test vehicles using the SQL INSERT statement above

## 🎯 Next Steps

1. **Run the SQL script** to create the vehicles table
2. **Add some test vehicles** to test the functionality
3. **Test the VIN scanner** on technician pages
4. **Install Cordova plugin** for mobile VIN scanning (optional)

## 📞 Support

If you're still having issues:
1. Check the browser console for error messages
2. Verify the vehicles table was created successfully
3. Test the API directly: `curl "http://localhost:3001/api/vehicles/search?vin=1HGBH41JXMN109186&debug=true"` 