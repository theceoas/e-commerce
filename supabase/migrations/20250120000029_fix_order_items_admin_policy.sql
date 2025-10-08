-- Fix admin policy for order_items that's causing permission denied for table users
-- RLS policies can't directly query auth.users table without special permissions

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;

-- Create a new admin policy that doesn't query auth.users directly
-- Instead, use auth.jwt() to get the email and role from the JWT token
CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      auth.jwt() ->> 'email' = 'abdu@manacquisition.com' OR
      auth.jwt() ->> 'role' = 'admin'
    )
  );