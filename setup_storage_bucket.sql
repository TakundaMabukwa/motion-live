-- Setup storage bucket for job photos
-- This script should be run in Supabase SQL editor

-- Create the invoices bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true,
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access to invoices bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'invoices');

-- Create storage policy for authenticated users to upload to invoices bucket
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

-- Create storage policy for authenticated users to update their uploads
CREATE POLICY "Users can update own uploads" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

-- Create storage policy for authenticated users to delete their uploads
CREATE POLICY "Users can delete own uploads" ON storage.objects
FOR DELETE USING (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

-- Ensure job_cards table has the before_photos JSONB column
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS before_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS after_photos JSONB DEFAULT '[]'::jsonb;

-- Add comments for the new columns
COMMENT ON COLUMN job_cards.before_photos IS 'JSONB array of before photos with metadata and storage URLs';
COMMENT ON COLUMN job_cards.after_photos IS 'JSONB array of after photos with metadata and storage URLs';

-- Create GIN index for better JSONB query performance
CREATE INDEX IF NOT EXISTS idx_job_cards_before_photos ON job_cards USING GIN (before_photos);
CREATE INDEX IF NOT EXISTS idx_job_cards_after_photos ON job_cards USING GIN (after_photos);
