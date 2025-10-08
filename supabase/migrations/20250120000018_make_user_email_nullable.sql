-- Make user_email nullable in cart_items table since we're now using user_id and session_id
ALTER TABLE cart_items ALTER COLUMN user_email DROP NOT NULL;