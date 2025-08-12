# Photo Capture System Setup Guide

## Overview
This system captures "before" photos during vehicle verification and stores them in Supabase storage, with metadata saved to the `job_cards.before_photos` JSONB field.

## Features
- 📸 **Live Camera Capture**: Use device camera to take photos
- 📁 **File Upload**: Upload existing photos from device
- ☁️ **Cloud Storage**: Photos stored in Supabase `invoices` bucket
- 🗄️ **Database Integration**: Photo metadata stored in `job_cards` table
- 🔗 **Public URLs**: Photos accessible via public URLs for display

## Database Setup

### 1. Run Storage Bucket Setup
Execute this SQL in your Supabase SQL editor:

```sql
-- Create the invoices bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true,
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own uploads" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete own uploads" ON storage.objects
FOR DELETE USING (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);
```

### 2. Update job_cards Table
```sql
-- Add photo columns
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS before_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS after_photos JSONB DEFAULT '[]'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_cards_before_photos ON job_cards USING GIN (before_photos);
CREATE INDEX IF NOT EXISTS idx_job_cards_after_photos ON job_cards USING GIN (after_photos);
```

## File Structure

```
components/ui-personal/
├── photo-capture-modal.tsx    # Photo capture interface
└── vehicle-verification-form.tsx  # Main verification form

app/api/
└── job-photos/
    └── route.ts               # Photo upload/retrieval API

lib/
└── photo-utils.ts             # Photo utility functions

app/test-vehicle-verification/
└── page.tsx                   # Test page for the system
```

## How It Works

### 1. Photo Capture Flow
```
Vehicle Verification → Photo Modal Opens → Camera/Upload → Save to Storage → Update Database
```

### 2. Storage Structure
```
invoices bucket/
└── job-photos/
    ├── job_JOB001_before_1234567890_abc123.jpg
    ├── job_JOB001_before_1234567891_def456.jpg
    └── ...
```

### 3. Database Schema
```json
{
  "before_photos": [
    {
      "id": "unique_id",
      "filename": "job_JOB001_before_1234567890_abc123.jpg",
      "storage_path": "job-photos/job_JOB001_before_1234567890_abc123.jpg",
      "public_url": "https://storage.supabase.co/invoices/job-photos/...",
      "description": "Front view of vehicle",
      "timestamp": "2025-01-08T10:30:00.000Z",
      "type": "before",
      "uploaded_at": "2025-01-08T10:30:00.000Z"
    }
  ]
}
```

## API Endpoints

### POST /api/job-photos
Uploads photos and saves metadata to job_cards table.

**Request Body:**
```json
{
  "jobNumber": "JOB-001",
  "vehicleRegistration": "ABC123GP",
  "photos": [
    {
      "id": "photo_id",
      "url": "data:image/jpeg;base64,...",
      "filename": "photo.jpg",
      "description": "Photo description",
      "timestamp": "2025-01-08T10:30:00.000Z",
      "type": "before"
    }
  ],
  "vehicleData": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "photos": [...],
  "vehicleId": "uuid",
  "message": "2 photos uploaded and saved successfully"
}
```

### GET /api/job-photos?jobNumber=JOB-001
Retrieves photos for a specific job.

**Response:**
```json
{
  "photos": {
    "before": [...],
    "after": [...]
  }
}
```

## Usage Examples

### 1. Basic Photo Capture
```tsx
import PhotoCaptureModal from '@/components/ui-personal/photo-capture-modal';

<PhotoCaptureModal
  isOpen={showPhotoCapture}
  onClose={handleClose}
  onPhotosSaved={handlePhotosSaved}
  jobNumber="JOB-001"
  vehicleRegistration="ABC123GP"
/>
```

### 2. Display Photos
```tsx
import { getPhotoDisplayUrl, formatPhotoTimestamp } from '@/lib/photo-utils';

{photos.map((photo) => (
  <div key={photo.id}>
    <img src={getPhotoDisplayUrl(photo)} alt={photo.description} />
    <p>{photo.description}</p>
    <p>{formatPhotoTimestamp(photo.timestamp)}</p>
  </div>
))}
```

### 3. Photo Count
```tsx
import { getPhotoCountByType } from '@/lib/photo-utils';

const beforePhotoCount = getPhotoCountByType(jobCard.before_photos, 'before');
const afterPhotoCount = getPhotoCountByType(jobCard.after_photos, 'after');
```

## Testing

### 1. Test Page
Visit `/test-vehicle-verification` to test the complete system.

### 2. Test Scenarios
- **Manual Entry**: Job without vehicle registration
- **VIN Scan**: Job with existing vehicle registration
- **Photo Capture**: Camera and file upload functionality
- **Storage Integration**: Photos saved to Supabase storage

## Security Considerations

### 1. Storage Policies
- Public read access for photos (consider if this meets your security requirements)
- Authenticated users can upload/update/delete
- File size limits (50MB)
- Allowed file types (images + PDFs)

### 2. Data Validation
- Photo metadata validation
- File type checking
- Size limits enforcement

### 3. Access Control
- Photos linked to specific jobs
- Vehicle association tracking
- User authentication required for uploads

## Troubleshooting

### Common Issues

#### 1. Camera Not Working
- Check browser permissions
- Ensure HTTPS (required for camera access)
- Test on different devices/browsers

#### 2. Upload Failures
- Check Supabase storage bucket exists
- Verify storage policies are correct
- Check file size limits
- Ensure proper authentication

#### 3. Photos Not Displaying
- Verify public URLs are accessible
- Check storage bucket permissions
- Validate photo metadata structure

### Debug Steps
1. Check browser console for errors
2. Verify API responses in Network tab
3. Check Supabase storage bucket contents
4. Validate database records

## Performance Considerations

### 1. Image Optimization
- Consider implementing image compression
- Use appropriate image formats (JPEG for photos)
- Implement lazy loading for photo galleries

### 2. Storage Management
- Monitor storage usage
- Implement cleanup for old photos
- Consider archiving strategies

### 3. Database Performance
- GIN indexes on JSONB columns
- Query optimization for photo searches
- Consider pagination for large photo sets

## Future Enhancements

### 1. Photo Management
- Bulk photo operations
- Photo editing capabilities
- Photo organization by categories

### 2. Advanced Features
- Photo watermarking
- Automatic photo tagging
- Integration with external services

### 3. Analytics
- Photo usage statistics
- Storage usage tracking
- User activity monitoring
