# 🔧 PDF Storage Fix Guide

## 🚨 Problem
You're encountering a `404 Bucket not found` error when trying to view or download PDFs. This indicates that the Supabase Storage bucket `invoices` is either:
1. Not created
2. Has incorrect permissions
3. Has RLS policies blocking access

## 🎯 Solution Steps

### Step 1: Create the Invoices Storage Bucket

1. **Go to your Supabase Dashboard**
   - Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click "Create a new bucket"

3. **Configure the Bucket**
   - **Name**: `invoices`
   - **Public bucket**: Check this if you want PDFs to be publicly accessible
   - **File size limit**: Set to a reasonable limit (e.g., 50MB)
   - **Allowed MIME types**: `application/pdf`

4. **Click "Create bucket"**

### Step 2: Configure Bucket Permissions

#### Option A: Public Bucket (Easier, less secure)
If you checked "Public bucket":
- PDFs will be accessible to anyone with the URL
- No additional configuration needed

#### Option B: Private Bucket with RLS Policies (More secure)
If you want to restrict access:

1. **Go to Storage > Policies**
2. **Click on the `invoices` bucket**
3. **Add a policy for SELECT (download/view):**
   ```sql
   -- Allow authenticated users to view/download PDFs
   CREATE POLICY "Allow authenticated users to view invoices" ON storage.objects
   FOR SELECT USING (auth.role() = 'authenticated' AND bucket_id = 'invoices');
   ```

4. **Add a policy for INSERT (upload):**
   ```sql
   -- Allow authenticated users to upload PDFs
   CREATE POLICY "Allow authenticated users to upload invoices" ON storage.objects
   FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'invoices');
   ```

### Step 3: Update Database Records

If you have existing records with incorrect `invoice_link` values:

1. **Go to SQL Editor in Supabase**
2. **Run this query to see current invoice links:**
   ```sql
   SELECT id, order_number, invoice_link 
   FROM stock_orders 
   WHERE invoice_link IS NOT NULL;
   ```

3. **Update incorrect links (if needed):**
   ```sql
   -- Example: Update a specific record
   UPDATE stock_orders 
   SET invoice_link = 'https://your-project.supabase.co/storage/v1/object/public/invoices/filename.pdf'
   WHERE id = 123;
   ```

### Step 4: Test the Configuration

1. **Upload a test PDF:**
   - Go to Storage > `invoices` bucket
   - Click "Upload file"
   - Select a PDF file
   - Note the public URL

2. **Test the URL:**
   - Copy the public URL
   - Open in a new browser tab
   - Should display/download the PDF

3. **Update a test record:**
   ```sql
   UPDATE stock_orders 
   SET invoice_link = 'YOUR_TEST_PDF_URL_HERE'
   WHERE id = 1;
   ```

## 🔍 Troubleshooting

### Common Issues

#### 1. "Bucket not found" Error
- **Cause**: Bucket doesn't exist
- **Solution**: Create the `invoices` bucket as described above

#### 2. "Access denied" Error
- **Cause**: RLS policies blocking access
- **Solution**: Check and update RLS policies

#### 3. "File not found" Error
- **Cause**: File was deleted or moved
- **Solution**: Re-upload the file or update the database record

#### 4. CORS Issues
- **Cause**: Browser blocking cross-origin requests
- **Solution**: Ensure bucket is public or CORS is properly configured

### Debug Commands

#### Check Bucket Status
```sql
-- In Supabase SQL Editor
SELECT * FROM storage.buckets WHERE name = 'invoices';
```

#### Check File Objects
```sql
-- In Supabase SQL Editor
SELECT * FROM storage.objects WHERE bucket_id = 'invoices';
```

#### Check RLS Policies
```sql
-- In Supabase SQL Editor
SELECT * FROM storage.policies WHERE bucket_id = 'invoices';
```

## 📋 Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_anon_key_here
```

## 🚀 Alternative Solutions

### Option 1: Use External Storage
If Supabase Storage continues to cause issues, consider:
- AWS S3
- Google Cloud Storage
- Azure Blob Storage

### Option 2: Store PDFs as Base64
For small PDFs, you could store them directly in the database:
```sql
ALTER TABLE stock_orders ADD COLUMN pdf_data TEXT;
```

### Option 3: Use a CDN
Upload PDFs to a CDN service and store only the URLs.

## 📞 Support

If you continue to experience issues:

1. **Check Supabase Status**: [https://status.supabase.com](https://status.supabase.com)
2. **Review Supabase Documentation**: [https://supabase.com/docs](https://supabase.com/docs)
3. **Check Supabase Community**: [https://github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)

## ✅ Success Checklist

- [ ] `invoices` bucket created in Supabase Storage
- [ ] Bucket permissions configured (public or RLS policies)
- [ ] Test PDF uploaded and accessible
- [ ] Database records updated with correct URLs
- [ ] PDF viewing/downloading working in the application
- [ ] Error handling implemented for edge cases

## 🔄 Next Steps

After fixing the storage issue:

1. **Test the application** - Try viewing and downloading PDFs
2. **Monitor for errors** - Check browser console and server logs
3. **Update existing records** - Fix any broken invoice links
4. **Implement monitoring** - Add logging for PDF access issues
5. **Consider backup strategy** - Implement PDF backup and recovery
