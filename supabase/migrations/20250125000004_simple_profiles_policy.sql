-- Simple approach to fix profiles RLS policies without recursion

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS is_admin_user();

-- Create simple policies that avoid recursion
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow hardcoded admin email to view all profiles (no recursion)
CREATE POLICY "Hardcoded admin can view all profiles" ON profiles
  FOR SELECT USING (auth.jwt() ->> 'email' = 'abdu@manacquisition.com');

-- Allow hardcoded admin email to update all profiles
CREATE POLICY "Hardcoded admin can update all profiles" ON profiles
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'abdu@manacquisition.com');

-- Allow hardcoded admin email to insert profiles
CREATE POLICY "Hardcoded admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'abdu@manacquisition.com');

-- For other admin users, we'll create a separate policy using a different approach
-- Create a policy that checks admin role for specific admin user IDs
CREATE POLICY "Known admin users can view all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = '1bb4abf5-c963-418c-87bc-e8f0326b26bc'::uuid -- asofficial001@yahoo.com
    OR auth.uid() = '8ec7555b-3bc5-45cd-add7-06737eb64f6e'::uuid -- abdu@manacquisition.com
  );

CREATE POLICY "Known admin users can update all profiles" ON profiles
  FOR UPDATE USING (
    auth.uid() = '1bb4abf5-c963-418c-87bc-e8f0326b26bc'::uuid -- asofficial001@yahoo.com
    OR auth.uid() = '8ec7555b-3bc5-45cd-add7-06737eb64f6e'::uuid -- abdu@manacquisition.com
  );

CREATE POLICY "Known admin users can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = '1bb4abf5-c963-418c-87bc-e8f0326b26bc'::uuid -- asofficial001@yahoo.com
    OR auth.uid() = '8ec7555b-3bc5-45cd-add7-06737eb64f6e'::uuid -- abdu@manacquisition.com
  );