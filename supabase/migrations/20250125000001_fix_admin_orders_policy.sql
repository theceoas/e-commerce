-- Fix admin orders policy to properly check admin role from profiles table
-- This fixes the issue where orders don't show up for admin users

-- Drop the incorrect hardcoded email policy
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;

-- Create proper admin policy that checks role in profiles table
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Also fix order_items policy for consistency
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;

CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Ensure the admin user has the correct role in profiles table
-- Update the profile for the admin user UUID provided
INSERT INTO profiles (user_id, email, role, first_name, last_name)
VALUES (
  '1bb4abf5-c963-418c-87bc-e8f0326b26bc',
  (SELECT email FROM auth.users WHERE id = '1bb4abf5-c963-418c-87bc-e8f0326b26bc'),
  'admin',
  'Admin',
  'User'
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  updated_at = NOW();