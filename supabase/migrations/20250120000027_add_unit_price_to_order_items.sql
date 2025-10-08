-- Add unit_price column to order_items table for frontend compatibility
-- The frontend expects unit_price but our schema has price

DO $$ 
BEGIN
    -- Add unit_price column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' 
        AND column_name = 'unit_price'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.order_items ADD COLUMN unit_price DECIMAL(10,2) CHECK (unit_price >= 0);
        
        -- Copy existing price values to unit_price for existing records
        UPDATE public.order_items 
        SET unit_price = price 
        WHERE unit_price IS NULL;
        
        -- Make unit_price NOT NULL after updating existing records
        ALTER TABLE public.order_items ALTER COLUMN unit_price SET NOT NULL;
        
        -- Add index for better performance on unit_price column
        CREATE INDEX IF NOT EXISTS idx_order_items_unit_price ON public.order_items(unit_price);
    END IF;
END $$;