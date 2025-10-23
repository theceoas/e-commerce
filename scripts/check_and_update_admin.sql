-- Check current user profile status
SELECT 'Current user status:' as info;
SELECT id, email, role, created_at FROM profiles WHERE id = 'dbb88b35-1f1b-4b1e-8613-b38fa290009a';

-- Update user to admin role
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'dbb88b35-1f1b-4b1e-8613-b38fa290009a';

-- Verify the update
SELECT 'Updated user status:' as info;
SELECT id, email, role, created_at FROM profiles WHERE id = 'dbb88b35-1f1b-4b1e-8613-b38fa290009a';