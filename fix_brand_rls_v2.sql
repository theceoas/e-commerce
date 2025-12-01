-- Alternative RLS fix - remove role check and just use auth.uid()
-- This is more lenient but will work with the client-side Supabase SDK

-- Drop all existing policies for brand-images bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Brand Images" ON storage.objects;
DROP POLICY IF EXISTS "brand_images_public_select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload brand images" ON storage.objects;
DROP POLICY IF EXISTS "brand_images_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand images" ON storage.objects;
DROP POLICY IF EXISTS "brand_images_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand images" ON storage.objects;
DROP POLICY IF EXISTS "brand_images_auth_delete" ON storage.objects;

-- Create policies that work with auth.uid() which is what the client SDK uses
CREATE POLICY "brand_images_public_select" ON storage.objects
FOR SELECT USING (bucket_id = 'brand-images');

CREATE POLICY "brand_images_auth_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'brand-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "brand_images_auth_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'brand-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "brand_images_auth_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'brand-images' 
  AND auth.uid() IS NOT NULL
);
