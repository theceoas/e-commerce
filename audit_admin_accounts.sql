-- CRITICAL: Check if any users were accidentally created with admin role
-- Run this in Supabase SQL Editor to find the problem accounts

-- Find all users with admin role
SELECT 
  id,
  user_id,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC;

-- IMPORTANT: Review the results above
-- If you see any accounts that should NOT be admin (e.g., customer emails),
-- you need to change their role to 'customer'

-- To fix a specific user (replace 'USER_ID_HERE' with actual user_id):
-- UPDATE profiles 
-- SET role = 'customer' 
-- WHERE user_id = 'USER_ID_HERE';

-- To see total count:
SELECT 
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role;
