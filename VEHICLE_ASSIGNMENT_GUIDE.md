# 🚗 Vehicle Assignment to Jobs Guide
## 📋 Overview

This guide explains how the vehicle assignment feature works. When a technician scans a VIN or creates a new vehicle, it gets automatically assigned to the job card.

## 🔧 How It Works

### **1. VIN Scanning Process**
1. **Technician clicks "Scan Vehicle VIN"** on any job card
2. **VinScanner opens** with the job context
3. **VIN is scanned or entered** manually
4. **System searches** for existing vehicle in database
5. **If found**: Vehicle details are assigned to job
6. **If not found**: New vehicle form opens, technician fills details
7. **Vehicle is created** and assigned to job

### **2. Database Updates**

#### **cust_quotes Table**
- `selected_vehicles` field is updated with the VIN number
- `updated_at` timestamp is updated

#### **quote_products Table**
- `vehicle` array field is updated with complete vehicle details:
  ```json
  {
    "vin_number": "1HGBH41JXMN109186",
    "registration_number": "CA 123 GP",
    "make": "honda",
    "model": "civic",
    "manufactured_year": 2019,
    "color": "black",
    "fuel_type": "petrol",
    "transmission_type": "manual",
    "engine_number": "ENG987654321",
    "vehicle_type": "sedan",
    "action": "found", // or "created"
    "assigned_at": "2024-01-15T10:30:00Z",
    "assigned_by": "tech@example.com"
  }
  ```

## 🛠️ API Endpoints

### **POST /api/jobs/[id]/assign-vehicle**
Assigns vehicle details to a specific job.

**Request Body:**
```json
{
  "vehicleData": {
    "vin_number": "1HGBH41JXMN109186",
    "registration_number": "CA 123 GP",
    "make": "honda",
    "model": "civic",
    "manufactured_year": 2019,
    "color": "black",
    "fuel_type": "petrol",
    "transmission_type": "manual",
    "engine_number": "ENG987654321",
    "vehicle_type": "sedan"
  },
  "action": "found" // or "created"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicle found and assigned to job",
  "job": {
    "id": "job-uuid",
    "vehicle": { /* vehicle data */ },
    "action": "found",
    "assignedBy": "tech@example.com",
    "assignedAt": "2024-01-15T10:30:00Z"
  }
}
```

## 📱 User Interface

### **Job Cards**
- **"Scan Vehicle VIN" button** on each job card
- **Vehicle information** displayed after assignment
- **Status updates** when vehicle is assigned

### **VinScanner Component**
- **Job context** passed via `jobId` prop
- **Automatic assignment** when vehicle is found/created
- **Success notifications** for assignment status

## 🔄 Workflow Examples

### **Example 1: Existing Vehicle Found**
1. **Technician** clicks "Scan Vehicle VIN" on job #123
2. **VinScanner** opens with job context
3. **VIN "1HGBH41JXMN109186"** is scanned
4. **System finds** existing Honda Civic in database
5. **Vehicle details** are automatically assigned to job #123
6. **Success message**: "Vehicle found and assigned to job successfully!"
7. **Job card** now shows vehicle information

### **Example 2: New Vehicle Created**
1. **Technician** clicks "Scan Vehicle VIN" on job #456
2. **VinScanner** opens with job context
3. **VIN "NEW123456789"** is scanned
4. **System doesn't find** vehicle in database
5. **New vehicle form** opens automatically
6. **Technician fills** vehicle details (make, model, etc.)
7. **Vehicle is created** in database
8. **Vehicle is assigned** to job #456
9. **Success message**: "New vehicle created and assigned to job successfully!"

## 🗄️ Database Schema

### **cust_quotes Table**
```sql
selected_vehicles text -- VIN number of assigned vehicle
```

### **quote_products Table**
```sql
vehicle ARRAY -- JSON array with vehicle details
```

## 🔍 Monitoring & Tracking

### **Assignment Tracking**
- **Action type**: "found" or "created"
- **Assigned by**: Technician email
- **Assigned at**: Timestamp
- **Vehicle details**: Complete vehicle information

### **Job Status Updates**
- **Vehicle assignment** triggers job status updates
- **Technician availability** is recalculated
- **Calendar events** are updated with vehicle info

## 🧪 Testing

### **Test 1: Existing Vehicle Assignment**
```bash
# 1. Login as technician
# 2. Go to any job card
# 3. Click "Scan Vehicle VIN"
# 4. Enter existing VIN: "1HGBH41JXMN109186"
# 5. Verify vehicle is found and assigned
```

### **Test 2: New Vehicle Creation**
```bash
# 1. Login as technician
# 2. Go to any job card
# 3. Click "Scan Vehicle VIN"
# 4. Enter new VIN: "NEW123456789"
# 5. Fill vehicle details form
# 6. Verify vehicle is created and assigned
```

### **Test 3: Database Verification**
```sql
-- Check cust_quotes table
SELECT id, selected_vehicles FROM cust_quotes WHERE selected_vehicles IS NOT NULL;

-- Check quote_products table
SELECT quote_id, vehicle FROM quote_products WHERE vehicle IS NOT NULL;
```

## ⚠️ Error Handling

### **Common Issues**
1. **Authentication required** - User must be logged in
2. **Job not found** - Invalid job ID
3. **Database errors** - RLS policies or connection issues
4. **Vehicle creation failed** - Missing required fields

### **Error Messages**
- **"Not authenticated"** - Login required
- **"Job not found"** - Invalid job ID
- **"Failed to assign vehicle to job"** - Database error
- **"Vehicle creation failed"** - Form validation error

## 🎯 Benefits

### **For Technicians**
- **Automatic assignment** - No manual data entry
- **Real-time updates** - Immediate job status changes
- **Vehicle tracking** - Complete vehicle history
- **Error reduction** - Automated data capture

### **For Management**
- **Complete audit trail** - Who assigned what vehicle when
- **Vehicle inventory** - Track all vehicles in system
- **Job efficiency** - Faster vehicle assignment process
- **Data accuracy** - Automated data capture reduces errors

## 🔒 Security Features

### **Authentication Required**
- All vehicle assignment operations require authentication
- User context is tracked for audit purposes
- RLS policies protect vehicle data

### **Data Validation**
- VIN format validation
- Required field validation
- Vehicle data integrity checks

## ✅ Success Indicators

### **Assignment Success**
- ✅ Vehicle details appear on job card
- ✅ Database records are updated
- ✅ Success notification is shown
- ✅ Job status reflects vehicle assignment

### **System Health**
- ✅ API endpoints respond correctly
- ✅ Database queries execute successfully
- ✅ UI updates reflect changes
- ✅ Error handling works properly

## 🚀 Ready to Use!

The vehicle assignment feature is now fully functional:

1. **Scan VINs** from job cards
2. **Find existing vehicles** automatically
3. **Create new vehicles** when needed
4. **Assign vehicles** to jobs automatically
5. **Track assignments** with complete audit trail

**The system is ready for production use!** 🚗✨ 