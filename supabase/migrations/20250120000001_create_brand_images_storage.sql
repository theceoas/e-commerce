-- Create storage bucket for brand images
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-images', 'brand-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view brand images
CREATE POLICY "Public Access" ON storage.objects
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