-- Check current function
SELECT prosrc FROM pg_proc WHERE proname = 'generate_order_number';

-- Drop and recreate the function with better concurrency handling
DROP FUNCTION IF EXISTS generate_order_number();

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
        
        -- Small delay before retry
        PERFORM pg_sleep(0.01);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT generate_order_number() as test_order_number;