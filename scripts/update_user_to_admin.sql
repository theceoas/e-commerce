-- Check current user profile status
SELECT 'Current user status:' as info;
SELECT id, email, role, created_at FROM profiles WHERE id = 'ffa5c28d-a1d3-4f1c-91aa-16010e1f70e4' OR email = 'blessing@ft.com';

-- Update user to admin role (by UUID and email for safety)
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'ffa5c28d-a1d3-4f1c-91aa-16010e1f70e4' OR email = 'blessing@ft.com';

-- Verify the update
SELECT 'Updated user status:' as info;
SELECT id, email, role, created_at FROM profiles WHERE id = 'ffa5c28d-a1d3-4f1c-91aa-16010e1f70e4' OR email = 'blessing@ft.com';