# 📦 Stock Take System Setup Guide

## 🎯 Overview

The Stock Take system allows you to perform physical inventory counts, update stock quantities, and maintain a complete audit trail of all stock changes.

## 🗄️ Database Setup

### Step 1: Create Stock Take Log Table

Run the following SQL in your Supabase database:

```sql
-- Create stock_take_log table for tracking stock take activities
CREATE TABLE IF NOT EXISTS stock_take_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Stock item reference
    stock_item_id UUID NOT NULL REFERENCES stock(id),
    
    -- Quantity information
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    difference INTEGER NOT NULL, -- positive for increase, negative for decrease
    
    -- Stock take session information
    stock_take_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    
    -- Audit information
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional metadata
    session_id UUID, -- to group related stock take activities
    location VARCHAR(255), -- where the stock take was performed
    method VARCHAR(50) DEFAULT 'manual' -- manual, barcode, rfid, etc.
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_take_log_stock_item_id ON stock_take_log(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_log_date ON stock_take_log(stock_take_date);
CREATE INDEX IF NOT EXISTS idx_stock_take_log_performed_by ON stock_take_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_stock_take_log_session_id ON stock_take_log(session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE stock_take_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON stock_take_log
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON stock_take_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON stock_take_log
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON stock_take_log
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add trigger to update stock table's updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_stock_updated_at') THEN
        CREATE TRIGGER trigger_update_stock_updated_at
            BEFORE UPDATE ON stock
            FOR EACH ROW
            EXECUTE FUNCTION update_stock_updated_at();
    END IF;
END $$;
```

## 🚀 Features

### **1. Stock Take Mode**
- **Activate Mode**: Click "Start Stock Take" to enter stock take mode
- **Update Quantities**: Modify stock quantities directly in the interface
- **Real-time Differences**: See immediate visual feedback of quantity changes
- **Publish Changes**: Save all changes to the database with audit trail

### **2. Stock Take History**
- **Complete Audit Trail**: View all stock take activities
- **Filter Options**: Filter by increases, decreases, or no changes
- **Search Functionality**: Search by item description, code, or notes
- **Detailed Information**: See who performed the stock take and when

### **3. Visual Indicators**
- **Trend Icons**: Green up arrows for increases, red down arrows for decreases
- **Color Coding**: Green for positive changes, red for negative changes
- **Summary Cards**: Real-time summary of changes being made

## 📋 How to Use

### **Performing a Stock Take**

1. **Navigate to Stock Take**
   - Go to Inventory → Stock Take
   - Click "Start Stock Take" button

2. **Update Quantities**
   - Search for items using the search bar
   - Enter new quantities in the input fields
   - See real-time difference calculations

3. **Review Changes**
   - Check the summary card for total changes
   - Review all modified items

4. **Publish Changes**
   - Click "Publish Changes" to save to database
   - All changes are logged with audit trail

### **Viewing History**

1. **Access History Tab**
   - Click on the "History" tab
   - View all stock take activities

2. **Filter and Search**
   - Use the search bar to find specific items
   - Filter by change type (increases, decreases, no change)

3. **Review Details**
   - See previous and new quantities
   - View who performed the stock take
   - Check timestamps and notes

## 🔧 API Endpoints

### **GET /api/stock**
- Fetches all stock items
- Supports search and filtering
- Returns stock data for stock take interface

### **POST /api/stock/stock-take**
- Updates stock quantities
- Creates audit log entries
- Returns success/error status

### **GET /api/stock/stock-take**
- Fetches stock take history
- Supports pagination
- Returns detailed audit trail

## 🎨 UI Components

### **Stock Take Page (`/protected/inv/stock-take`)**
- Main stock take interface
- Tabbed layout with Stock Take and History
- Real-time quantity updates
- Visual difference indicators

### **Stock Take History Component**
- Displays audit trail
- Search and filter functionality
- Detailed change information

## 🔒 Security Features

- **Authentication Required**: All endpoints require user authentication
- **RLS Policies**: Database-level security for all tables
- **Audit Trail**: Complete logging of all changes
- **User Tracking**: All actions are tied to authenticated users

## 📊 Data Structure

### **Stock Take Log Entry**
```json
{
  "id": "uuid",
  "stock_item_id": "uuid",
  "previous_quantity": 100,
  "new_quantity": 95,
  "difference": -5,
  "stock_take_date": "2024-01-18T10:00:00Z",
  "notes": "Monthly stock take - found 5 damaged items",
  "performed_by": "user-uuid",
  "created_at": "2024-01-18T10:00:00Z",
  "session_id": "session-uuid",
  "location": "Warehouse A",
  "method": "manual"
}
```

## 🚨 Error Handling

- **Validation**: Ensures quantities are non-negative
- **Database Errors**: Graceful handling of database failures
- **User Feedback**: Toast notifications for all actions
- **Partial Failures**: Continues processing even if some items fail

## 🔄 Workflow

1. **Start Stock Take** → Enter stock take mode
2. **Update Quantities** → Modify stock levels
3. **Review Changes** → Check differences and summary
4. **Publish Changes** → Save to database with audit trail
5. **View History** → Access complete audit trail

## 📈 Benefits

- **Accuracy**: Physical counts ensure inventory accuracy
- **Audit Trail**: Complete history of all changes
- **Compliance**: Meets inventory management requirements
- **Efficiency**: Streamlined stock take process
- **Reporting**: Detailed reports for management review 