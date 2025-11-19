-- Create storage bucket for Excel files
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-files', 'excel-files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
CREATE POLICY "Allow authenticated users to upload Excel files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'excel-files' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public access to Excel files" ON storage.objects
FOR SELECT USING (bucket_id = 'excel-files');

CREATE POLICY "Allow authenticated users to delete their Excel files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'excel-files' 
  AND auth.role() = 'authenticated'
);