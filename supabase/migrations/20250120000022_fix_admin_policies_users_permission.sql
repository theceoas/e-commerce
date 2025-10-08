-- Fix admin policies that are causing permission denied for table users
-- RLS policies can't directly query auth.users table without special permissions

-- Fix orders table admin policy
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      auth.jwt() ->> 'email' = 'abdu@manacquisition.com' OR
      auth.jwt() ->> 'role' = 'admin'
    )
  );

-- Fix addresses table admin policy
DROP POLICY IF EXISTS "Admins can manage all addresses" ON addresses;
CREATE POLICY "Admins can manage all addresses" ON addresses
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      auth.jwt() ->> 'email' = 'abdu@manacquisition.com' OR
      auth.jwt() ->> 'role' = 'admin'
    )
  );