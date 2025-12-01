-- Quick fix for brand-images RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Brand Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload brand images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand images" ON storage.objects;

-- Re-create policies with proper names
CREATE POLICY "brand_images_public_select" ON storage.objects
FOR SELECT USING (bucket_id = 'brand-images');

CREATE POLICY "brand_images_auth_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'brand-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "brand_images_auth_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'brand-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "brand_images_auth_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'brand-images' 
  AND auth.role() = 'authenticated'
);
