-- Create testing storage bucket and make it public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'testing',
  'testing',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public read access to testing bucket
CREATE POLICY "Public read access for testing bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'testing');

-- Allow authenticated users to upload to testing bucket
CREATE POLICY "Authenticated users can upload to testing bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'testing' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their own uploads in testing bucket
CREATE POLICY "Authenticated users can update their own uploads in testing bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'testing' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'testing' AND auth.uid() = owner);

-- Allow authenticated users to delete their own uploads in testing bucket
CREATE POLICY "Authenticated users can delete their own uploads in testing bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'testing' AND auth.uid() = owner);