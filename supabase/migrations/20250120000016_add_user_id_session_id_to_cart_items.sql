-- Add missing columns to cart_items table
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

-- Drop the old unique constraint
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_email_product_id_key;

-- Create new unique constraints for both user scenarios
-- For authenticated users: unique combination of user_id, product_id, and size
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product_size 
ON cart_items (user_id, product_id, size) 
WHERE user_id IS NOT NULL;

-- For guest users: unique combination of session_id, product_id, and size
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_session_product_size 
ON cart_items (session_id, product_id, size) 
WHERE session_id IS NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id);