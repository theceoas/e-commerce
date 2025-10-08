-- Fix the profiles table admin policy to use the correct admin email

-- Drop the existing admin policy
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create a new admin policy with the correct email
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'abdu@manacquisition.com'
    )
  );

-- Also fix the addresses table admin policy for consistency
DROP POLICY IF EXISTS "Admins can manage all addresses" ON addresses;

CREATE POLICY "Admins can manage all addresses" ON addresses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'abdu@manacquisition.com'
    )
  );