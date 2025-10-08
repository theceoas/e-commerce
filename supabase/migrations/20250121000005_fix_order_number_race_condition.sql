-- Fix race condition in order number generation

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS orders_set_order_number ON orders;
DROP FUNCTION IF EXISTS set_order_number();
DROP FUNCTION IF EXISTS generate_order_number();

-- Create a more robust order number generation function with proper locking
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
    counter INTEGER;
    date_str TEXT;
    max_attempts INTEGER := 100;
    attempt INTEGER := 0;
BEGIN
    -- Get today's date string
    date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    LOOP
        -- Lock the table to prevent race conditions
        LOCK TABLE orders IN EXCLUSIVE MODE;
        
        -- Get the highest counter for today + 1
        SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'ORD-' || date_str || '-(.*)') AS INTEGER)), 0) + 1
        INTO counter
        FROM orders 
        WHERE order_number LIKE 'ORD-' || date_str || '-%';
        
        -- Format as ORD-YYYYMMDD-XXXX
        order_num := 'ORD-' || date_str || '-' || LPAD(counter::TEXT, 4, '0');
        
        -- Check if this order number already exists (extra safety)
        IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = order_num) THEN
            RETURN order_num;
        END IF;
        
        -- If we somehow still have a duplicate, increment and try again
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique order number after % attempts', max_attempts;
        END IF;
        
        -- Add some randomness to avoid infinite loops
        counter := counter + (RANDOM() * 10)::INTEGER + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a simpler trigger function
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER orders_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();