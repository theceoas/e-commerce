-- Fix order number generation function with proper syntax
-- Drop existing function and trigger
DROP TRIGGER IF EXISTS set_order_number_trigger ON orders;
DROP FUNCTION IF EXISTS set_order_number() CASCADE;
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;

-- Create improved order number generation function with advisory locks
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    today_date TEXT;
    counter INTEGER;
    new_order_number TEXT;
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
BEGIN
    today_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    LOOP
        attempt := attempt + 1;
        
        -- Use advisory lock to prevent race conditions
        PERFORM pg_advisory_lock(hashtext('order_number_generation'));
        
        BEGIN
            -- Get the highest counter for today
            SELECT COALESCE(
                MAX(CAST(SUBSTRING(order_number FROM 'ORD-' || today_date || '-(.*)') AS INTEGER)), 
                0
            ) + 1
            INTO counter
            FROM orders 
            WHERE order_number LIKE 'ORD-' || today_date || '-%';
            
            -- Generate new order number
            new_order_number := 'ORD-' || today_date || '-' || LPAD(counter::TEXT, 4, '0');
            
            -- Check if this order number already exists (double check)
            IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_number) THEN
                -- Release the lock and return the number
                PERFORM pg_advisory_unlock(hashtext('order_number_generation'));
                RETURN new_order_number;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Release lock on any error
            PERFORM pg_advisory_unlock(hashtext('order_number_generation'));
            RAISE;
        END;
        
        -- Release lock before retry
        PERFORM pg_advisory_unlock(hashtext('order_number_generation'));
        
        -- If we've tried too many times, give up
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique order number after % attempts', max_attempts;
        END IF;
        
        -- Small delay before retry (10ms)
        PERFORM pg_sleep(0.01);
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
CREATE TRIGGER set_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();