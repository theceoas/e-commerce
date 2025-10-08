-- Add role column to profiles table for role-based authentication

-- Add role column with default value 'customer'
ALTER TABLE profiles ADD COLUMN role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin'));

-- Create index for better performance on role queries
CREATE INDEX idx_profiles_role ON profiles(role);

-- Update existing profiles to have customer role (if any exist)
UPDATE profiles SET role = 'customer' WHERE role IS NULL;

-- Make role column NOT NULL after setting default values
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;

-- Update RLS policies to use role from profiles table
-- Drop existing admin policies that rely on hardcoded emails
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all addresses" ON addresses;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;

-- Create new admin policies that check role from profiles table
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      -- Check if user has admin role in profiles table
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      ) OR
      -- Fallback to hardcoded admin email for initial setup
      auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
    )
  );

CREATE POLICY "Admins can manage all addresses" ON addresses
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      ) OR
      auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
    )
  );

CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      ) OR
      auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
    )
  );

CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
      ) OR
      auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
    )
  );

-- Create admin profile for the hardcoded admin email if it doesn't exist
INSERT INTO profiles (user_id, email, role, first_name, last_name)
SELECT 
  id, 
  email, 
  'admin',
  'Admin',
  'User'
FROM auth.users 
WHERE email = 'abdu@manacquisition.com'
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.users.id
);