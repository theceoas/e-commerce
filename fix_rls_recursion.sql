-- Fix infinite recursion in RLS policies
-- The previous policy caused a 500 error because checking "am I an admin" required reading the profiles table,
-- which triggered the "can I read profiles" policy, which checked "am I an admin"... infinite loop.

-- 1. Create a secure function to check if a user is an admin
-- SECURITY DEFINER means it runs with the privileges of the creator (postgres/admin), bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the broken policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- 3. Re-create policies using the secure function (no recursion)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  is_admin()
);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  is_admin()
);

CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (
  is_admin()
);

-- 4. Ensure INSERT policy is still there (it didn't have recursion)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
