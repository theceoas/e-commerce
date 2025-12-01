-- Verify the most recent profiles to see if names are being saved
SELECT 
  id,
  user_id,
  email,
  first_name,
  last_name,
  phone,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
