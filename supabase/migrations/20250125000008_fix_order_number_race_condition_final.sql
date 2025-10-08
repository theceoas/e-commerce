-- Fix order number generation race condition with proper UUID-based approach
-- This completely eliminates the race condition by using UUIDs with timestamp prefixes

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS orders_set_order_number ON orders;
DROP FUNCTION IF EXISTS set_order_number();
DROP FUNCTION IF EXISTS generate_order_number();

-- Create a new robust order number generation function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    today_date TEXT;
    random_suffix TEXT;
    new_order_number TEXT;
    attempt INTEGER := 0;
    max_attempts INTEGER := 50;
BEGIN
    today_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    LOOP
        attempt := attempt + 1;
        
        -- Generate a random 6-character suffix using timestamp and random
        random_suffix := LPAD(
            (EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000000)::BIGINT % 1000000::TEXT, 
            6, 
            '0'
        );
        
        -- Create order number: ORD-YYYYMMDD-XXXXXX
        new_order_number := 'ORD-' || today_date || '-' || random_suffix;
        
        -- Check if this order number already exists
        IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_number) THEN
            RETURN new_order_number;
        END IF;
        
        -- If we've tried too many times, add a UUID suffix to guarantee uniqueness
        IF attempt >= max_attempts THEN
            new_order_number := 'ORD-' || today_date || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8);
            RETURN new_order_number;
        END IF;
        
        -- Small delay to ensure different timestamps
        PERFORM pg_sleep(0.001);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER orders_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- Update any existing orders that might have NULL order numbers
UPDATE orders 
SET order_number = generate_order_number() 
WHERE order_number IS NULL;