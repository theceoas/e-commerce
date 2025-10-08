-- Fix existing orders that violate the user_id/guest_email constraint
-- This migration ensures all orders comply with the constraint:
-- (user_id IS NOT NULL AND guest_email IS NULL) OR (user_id IS NULL AND guest_email IS NOT NULL)

-- First, let's identify and fix orders that have both user_id and guest_email
UPDATE orders 
SET guest_email = NULL 
WHERE user_id IS NOT NULL AND guest_email IS NOT NULL;

-- Fix orders that have neither user_id nor guest_email by setting a default guest_email
UPDATE orders 
SET guest_email = COALESCE(user_email, 'unknown@guest.com')
WHERE user_id IS NULL AND guest_email IS NULL;

-- For orders that still have user_email but no user_id, try to match with existing users
UPDATE orders 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE auth.users.email = orders.user_email 
  LIMIT 1
)
WHERE user_id IS NULL 
  AND user_email IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.email = orders.user_email
  );

-- For remaining orders with user_email but no matching user_id, set guest_email
UPDATE orders 
SET guest_email = user_email
WHERE user_id IS NULL 
  AND guest_email IS NULL 
  AND user_email IS NOT NULL;

-- Final cleanup: ensure no orders violate the constraint
-- If any orders still violate, set them as guest orders
UPDATE orders 
SET guest_email = COALESCE(user_email, 'legacy@guest.com'),
    user_id = NULL
WHERE NOT (
  (user_id IS NOT NULL AND guest_email IS NULL) OR 
  (user_id IS NULL AND guest_email IS NOT NULL)
);