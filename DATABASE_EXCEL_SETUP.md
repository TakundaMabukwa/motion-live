# Database Excel Generation Setup

This setup moves Excel generation from client-side to Supabase Edge Functions with file storage.

## Benefits
- **Performance**: No more 90-second delays on hosted environments
- **Scalability**: Handles thousands of records efficiently
- **Storage**: Files stored in Supabase Storage for future access
- **Memory**: No browser memory limitations

## Setup Steps

### 1. Create Storage Bucket
Run the SQL script to create the storage bucket:
```sql
-- Run this in your Supabase SQL editor
\i setup-excel-storage.sql
```

### 2. Deploy Edge Function
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the edge function
supabase functions deploy bulk-invoice-excel --project-ref YOUR_PROJECT_REF
```

### 3. Environment Variables
Ensure these are set in your Supabase project:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Test the Function
The new API endpoint `/api/vehicles/bulk-invoice-db` will:
1. Call the Supabase Edge Function
2. Generate Excel file in the database
3. Store file in Supabase Storage
4. Return download URL
5. Auto-download file in browser

## File Structure
```
supabase/
├── functions/
│   └── bulk-invoice-excel/
│       └── index.ts          # Edge function code
├── config.toml               # Supabase configuration
└── setup-excel-storage.sql   # Storage bucket setup

app/api/vehicles/
└── bulk-invoice-db/
    └── route.ts              # API route that calls edge function
```

## How It Works
1. User clicks "Bulk Invoice (Excel)" button
2. Frontend calls `/api/vehicles/bulk-invoice-db`
3. API calls Supabase Edge Function
4. Edge Function:
   - Fetches all vehicle data with pagination
   - Generates Excel file using XLSX library
   - Uploads file to Supabase Storage
   - Returns download URL
5. Frontend downloads file from storage URL

## Performance Improvements
- **Server-side processing**: No browser limitations
- **Pagination**: Handles >1000 records efficiently  
- **Storage**: Files persist for future downloads
- **Memory**: No client-side memory issues
- **Speed**: Much faster than client-side generation