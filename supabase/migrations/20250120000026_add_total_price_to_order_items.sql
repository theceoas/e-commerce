-- Add total_price column to order_items table to support checkout flow
-- This fixes the checkout error where total_price column is missing

DO $$ 
BEGIN
    -- Add total_price column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' 
        AND column_name = 'total_price'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.order_items ADD COLUMN total_price DECIMAL(10,2) CHECK (total_price >= 0);
        
        -- Add index for better performance on total_price column
        CREATE INDEX IF NOT EXISTS idx_order_items_total_price ON public.order_items(total_price);
        
        -- Update existing records to calculate total_price from price * quantity
        UPDATE public.order_items 
        SET total_price = price * quantity 
        WHERE total_price IS NULL;
        
        -- Make total_price NOT NULL after updating existing records
        ALTER TABLE public.order_items ALTER COLUMN total_price SET NOT NULL;
    END IF;
END $$;