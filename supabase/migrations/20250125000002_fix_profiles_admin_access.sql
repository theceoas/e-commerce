-- Fix profiles table RLS policies to allow admin access to all customer data

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;

-- Create new policies for profiles table
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all profiles
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR 
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
  );

-- Allow admins to update all profiles
CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR 
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
  );

-- Allow admins to insert profiles
CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR 
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
  );

-- Also fix addresses table policies for admin access
DROP POLICY IF EXISTS "Admin can view all addresses" ON addresses;
DROP POLICY IF EXISTS "Admin can update all addresses" ON addresses;

-- Allow admins to view all addresses
CREATE POLICY "Admin can view all addresses" ON addresses
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR 
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
  );

-- Allow admins to update all addresses
CREATE POLICY "Admin can update all addresses" ON addresses
  FOR UPDATE USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
    OR 
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
  );