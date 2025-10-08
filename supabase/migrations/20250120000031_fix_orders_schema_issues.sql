-- Fix orders table schema issues

-- Add order_number column
ALTER TABLE orders ADD COLUMN order_number VARCHAR(50);

-- Create a function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
    counter INTEGER;
    date_str TEXT;
BEGIN
    -- Get today's date string
    date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get the highest counter for today + 1
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'ORD-' || date_str || '-(.*)') AS INTEGER)), 0) + 1
    INTO counter
    FROM orders 
    WHERE order_number LIKE 'ORD-' || date_str || '-%';
    
    -- Format as ORD-YYYYMMDD-XXXX
    order_num := 'ORD-' || date_str || '-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Update existing orders with unique order numbers
DO $$
DECLARE
    order_record RECORD;
    new_order_num TEXT;
    counter INTEGER := 1;
BEGIN
    FOR order_record IN SELECT id, created_at FROM orders WHERE order_number IS NULL ORDER BY created_at
    LOOP
        new_order_num := 'ORD-' || TO_CHAR(order_record.created_at, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_num) LOOP
            counter := counter + 1;
            new_order_num := 'ORD-' || TO_CHAR(order_record.created_at, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        END LOOP;
        
        UPDATE orders SET order_number = new_order_num WHERE id = order_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Make order_number NOT NULL and unique
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

-- Create a trigger to auto-generate order numbers for new orders
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- Update status constraint to include new status values
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled'));

-- Create index for order_number
CREATE INDEX idx_orders_order_number ON orders(order_number);