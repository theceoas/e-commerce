-- Fix brands table RLS policy with correct admin email
-- Drop the existing policy
DROP POLICY IF EXISTS "Admin users can manage brands" ON brands;

-- Create updated policy with correct admin email
CREATE POLICY "Admin users can manage brands" ON brands
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'abdu@manacquisition.com'
    )
  );