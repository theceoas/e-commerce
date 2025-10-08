-- Temporarily allow all authenticated users to manage brands for debugging
-- Drop the existing policy
DROP POLICY IF EXISTS "Admin users can manage brands" ON brands;

-- Create a temporary policy that allows all authenticated users
CREATE POLICY "Authenticated users can manage brands" ON brands
  FOR ALL USING (auth.uid() IS NOT NULL);