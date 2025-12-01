-- Fix RLS policies for brand-images storage bucket
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload brand images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand images" ON storage.objects;

-- Re-create policies with explicit names to avoid collision with other buckets if any generic policies exist
-- (Though policies are usually scoped to table, names must be unique per table)

-- Allow public access to view brand images
CREATE POLICY "Public Access Brand Images" ON storage.objects
FOR SELECT USING (bucket_id = 'brand-images');

-- Allow authenticated users to upload brand images
CREATE POLICY "Authenticated users can upload brand images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'brand-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update brand images
CREATE POLICY "Authenticated users can update brand images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'brand-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete brand images
CREATE POLICY "Authenticated users can delete brand images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'brand-images' 
  AND auth.role() = 'authenticated'
);
