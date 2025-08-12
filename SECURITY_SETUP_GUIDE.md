# 🔒 Security Setup Guide for VIN Scanner

## 📋 Overview

All VIN scanner endpoints now require authentication. This guide explains the security measures and how to set up the database properly.

## 🔐 Security Features

### **Authentication Required**
- ✅ All API endpoints require valid user authentication
- ✅ No debug mode bypass for unauthenticated requests
- ✅ Proper error handling for authentication failures
- ✅ RLS policies ensure database security

### **Protected Endpoints**
- `/api/vehicles` - Vehicle creation and search
- `/api/vehicles/search` - Vehicle search by VIN
- `/api/test-vehicles-db` - Database testing
- `/api/tech-user-info` - User information

## 🗄️ Database Security Setup

### **Step 1: Run the Complete RLS Fix**

Execute this SQL in your Supabase SQL editor:

```sql
-- Complete RLS Policy Fix for Vehicles Database
-- This script ensures authenticated users can access the vehicles and vehicles_ip tables

-- Step 1: Disable RLS temporarily to check table structure
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles_ip DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON vehicles;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON vehicles_ip;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON vehicles_ip;

-- Step 3: Create comprehensive policies for vehicles table
CREATE POLICY "Enable all access for authenticated users" ON vehicles
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 4: Create comprehensive policies for vehicles_ip table
CREATE POLICY "Enable all access for authenticated users" ON vehicles_ip
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 5: Re-enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles_ip ENABLE ROW LEVEL SECURITY;
```

### **Step 2: Add Test Data**

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
)
ON CONFLICT (vin_number) DO NOTHING;
```

## 🧪 Testing Security

### **Test 1: Unauthenticated Access (Should Fail)**
```bash
curl "http://localhost:3001/api/test-vehicles-db"
```

**Expected Response:**
```json
{
  "error": "Not authenticated"
}
```

### **Test 2: Authenticated Access (Should Work)**
1. **Login to the application** in your browser
2. **Open browser developer tools** (F12)
3. **Go to Network tab**
4. **Navigate to any tech page** (e.g., `/protected/tech/schedule`)
5. **Look for the authentication cookie** in the request headers
6. **Copy the cookie** and use it in your curl request:

```bash
curl -H "Cookie: your-auth-cookie-here" "http://localhost:3001/api/test-vehicles-db"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Vehicles database is properly configured",
  "user": "user@example.com",
  "tests": {
    "tableAccessible": true,
    "canRead": true,
    "canInsert": true,
    "sampleDataCount": 3,
    "ipTableAccessible": true
  }
}
```

### **Test 3: Vehicle Search (Authenticated)**
```bash
curl -H "Cookie: your-auth-cookie-here" "http://localhost:3001/api/vehicles/search?vin=1HGBH41JXMN109186"
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
      "model": "civic"
    }
  ],
  "count": 1,
  "vin": "1HGBH41JXMN109186",
  "user": "user@example.com"
}
```

## 🔍 Error Handling

### **Authentication Errors**
- **401 Unauthorized**: User not logged in
- **403 Forbidden**: RLS policy blocking access
- **500 Internal Server Error**: Database connection issues

### **Common Error Messages**

#### **"Not authenticated"**
- **Cause**: User not logged into the application
- **Solution**: Login to the application first

#### **"Database access denied. Please check RLS policies."**
- **Cause**: RLS policies are too restrictive
- **Solution**: Run the RLS fix SQL script

#### **"Vehicles table not accessible"**
- **Cause**: Table doesn't exist or wrong permissions
- **Solution**: Create the vehicles table first

## 🛡️ Security Features

### **1. Authentication Required**
- All endpoints check for valid user session
- No debug mode bypass for unauthenticated requests
- Proper error messages for authentication failures

### **2. Database Security**
- RLS policies ensure only authenticated users can access data
- Comprehensive policies for all operations (SELECT, INSERT, UPDATE, DELETE)
- Proper error handling for database access issues

### **3. Input Validation**
- VIN parameter validation
- Required field validation for vehicle creation
- SQL injection protection through Supabase client

### **4. Error Handling**
- Detailed error messages for debugging
- Proper HTTP status codes
- Security-conscious error responses (no sensitive data exposure)

## 🔧 API Endpoints Security

### **GET /api/vehicles/search**
- **Authentication**: Required
- **Parameters**: `vin` (required), `debug` (optional)
- **Security**: Validates VIN input, checks authentication

### **POST /api/vehicles**
- **Authentication**: Required
- **Body**: Vehicle data (validated)
- **Security**: Validates all required fields, checks authentication

### **GET /api/test-vehicles-db**
- **Authentication**: Required
- **Purpose**: Database connectivity testing
- **Security**: Only accessible to authenticated users

## ✅ Verification Checklist

- [ ] RLS policies configured correctly
- [ ] Test data added to database
- [ ] Unauthenticated requests return 401
- [ ] Authenticated requests work properly
- [ ] Vehicle search works with authentication
- [ ] Vehicle creation works with authentication
- [ ] Error messages are clear and helpful
- [ ] No sensitive data exposed in error responses

## 🎉 Security Complete!

Once all tests pass, the VIN scanner endpoints are secure:

1. **Authentication required** for all operations
2. **Database access** protected by RLS policies
3. **Input validation** prevents malicious requests
4. **Error handling** provides clear feedback
5. **No debug bypass** for unauthenticated users

**The system is now secure and ready for production use!** 🔒✅ 