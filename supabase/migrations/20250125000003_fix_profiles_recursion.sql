-- Fix infinite recursion in profiles RLS policies

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;

-- Create a function to check if user is admin (to avoid recursion)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user's email is the hardcoded admin
  IF auth.jwt() ->> 'email' = 'abdu@manacquisition.com' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if the current user has admin role
  -- Use a direct query to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Allow admins to view all profiles (using function to avoid recursion)
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
    OR 
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

-- Allow admins to update all profiles
CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
    OR 
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

-- Allow admins to insert profiles
CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' = 'abdu@manacquisition.com'
    OR 
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );