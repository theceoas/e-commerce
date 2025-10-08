-- Add missing columns to orders table to support modern checkout flow

-- Add user_id column for authenticated users
ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add guest_email column for guest checkouts
ALTER TABLE orders ADD COLUMN guest_email VARCHAR(255);

-- Add subtotal column
ALTER TABLE orders ADD COLUMN subtotal DECIMAL(10,2) CHECK (subtotal >= 0);

-- Add shipping_address column as JSONB
ALTER TABLE orders ADD COLUMN shipping_address JSONB;

-- Add payment_status column
ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Make user_email nullable since we now have user_id and guest_email
ALTER TABLE orders ALTER COLUMN user_email DROP NOT NULL;

-- Add constraint to ensure either user_id or guest_email is provided
ALTER TABLE orders ADD CONSTRAINT orders_user_check 
  CHECK ((user_id IS NOT NULL AND guest_email IS NULL) OR (user_id IS NULL AND guest_email IS NOT NULL));

-- Create indexes for better performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_guest_email ON orders(guest_email);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);