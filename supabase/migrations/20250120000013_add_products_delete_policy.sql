-- Add missing DELETE policy for products table
-- This allows authenticated users to delete products

CREATE POLICY "Products are deletable by authenticated users" ON products
  FOR DELETE USING (auth.role() = 'authenticated');