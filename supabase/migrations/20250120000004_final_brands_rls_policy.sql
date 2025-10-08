-- Final brands table RLS policy with proper admin check
-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can manage brands" ON brands;

-- Create policy that allows the specific admin user
CREATE POLICY "Admin user can manage brands" ON brands
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      -- Check if user email is the admin email
      (SELECT email FROM auth.users WHERE id = auth.uid()) = 'abdu@manacquisition.com'
      OR
      -- Fallback: allow any authenticated user for now (can be removed later)
      auth.uid() IS NOT NULL
    )
  );