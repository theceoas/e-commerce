-- Clean up duplicate and confusing RLS policies for profiles
-- We will keep one clear set of policies

-- Drop all existing policies to start fresh (and safe)
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Hardcoded admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Hardcoded admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Hardcoded admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Known admin users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Known admin users can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Known admin users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create clean, comprehensive policies

-- 1. VIEW: Users can view their own profile, Admins can view all
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2. INSERT: Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can update their own profile, Admins can update all
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 4. DELETE: Admins can delete profiles (optional, usually not needed for users)
CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Verify policies
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';
