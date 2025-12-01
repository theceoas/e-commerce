-- Add missing payment_reference column to orders table
-- This column stores the Paystack payment transaction reference

-- Add the column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Add index for faster lookups by payment reference
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference 
ON orders(payment_reference);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
AND column_name = 'payment_reference';
