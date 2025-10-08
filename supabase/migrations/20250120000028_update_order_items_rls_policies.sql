-- Update RLS policies for order_items table to handle both authenticated and guest users
-- This fixes the RLS policy violation error when inserting order items

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert their own order items" ON order_items;

-- Create new policies that handle both user_id and guest_email
CREATE POLICY "Users can view their own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (
        (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
        (auth.uid() IS NULL AND orders.guest_email IS NOT NULL)
      )
    )
  );

CREATE POLICY "Users can insert their own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (
        (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
        (auth.uid() IS NULL AND orders.guest_email IS NOT NULL)
      )
    )
  );

CREATE POLICY "Users can update their own order items" ON order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (
        (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
        (auth.uid() IS NULL AND orders.guest_email IS NOT NULL)
      )
    )
  );

-- Allow admin users to manage all order items
CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'email' IN (
      SELECT email FROM auth.users WHERE raw_user_meta_data ->> 'role' = 'admin'
    )
  );