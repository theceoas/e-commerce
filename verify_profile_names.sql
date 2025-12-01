-- Verify that first_name and last_name are being saved correctly in profiles table
-- Run this in Supabase SQL Editor

-- Check recent profiles to see if names are populated
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  phone,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 20;

-- Check if there are any profiles missing first_name or last_name
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  created_at
FROM profiles
WHERE role = 'customer'
  AND (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '')
ORDER BY created_at DESC;

-- If you see profiles missing names, they were created before the fix
-- Future signups will have names automatically saved
