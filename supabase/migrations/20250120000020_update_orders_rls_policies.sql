-- Update RLS policies for orders table to handle both authenticated and guest users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;

-- Create new policies that handle both user_id and guest_email
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND guest_email IS NOT NULL)
  );

CREATE POLICY "Users can insert their own orders" ON orders
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid() AND guest_email IS NULL) OR
    (auth.uid() IS NULL AND guest_email IS NOT NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can update their own orders" ON orders
  FOR UPDATE USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND guest_email IS NOT NULL)
  );

-- Allow admin users to manage all orders
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'email' IN (
      SELECT email FROM auth.users WHERE raw_user_meta_data ->> 'role' = 'admin'
    )
  );