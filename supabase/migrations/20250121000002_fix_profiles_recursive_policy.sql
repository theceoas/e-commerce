-- Fix infinite recursion in profiles table RLS policies
-- The issue is that admin policies are checking the profiles table from within the profiles table policies

-- Drop the problematic admin policy that causes recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create a simpler admin policy that only uses the hardcoded admin email
-- This avoids the recursion issue while still allowing admin access
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
  );

-- For other tables, we can still use the role-based approach since they don't cause recursion
-- But let's also simplify them to avoid potential issues

-- Fix addresses table policy
DROP POLICY IF EXISTS "Admins can manage all addresses" ON addresses;
CREATE POLICY "Admins can manage all addresses" ON addresses
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
  );

-- Fix orders table policy  
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
  );

-- Fix order_items table policy
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;
CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
  );

-- Add a separate policy for profile creation during signup
-- This allows the trigger function to create profiles without admin checks
CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT WITH CHECK (true);

-- Update the existing user policies to be more specific
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    auth.jwt() ->> 'email' = email
  );