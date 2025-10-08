-- Add size column to order_items table to support product sizes in orders
-- This fixes the checkout error where size column is missing

DO $$ 
BEGIN
    -- Add size column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' 
        AND column_name = 'size'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.order_items ADD COLUMN size TEXT;
        
        -- Add index for better performance on size column
        CREATE INDEX IF NOT EXISTS idx_order_items_size ON public.order_items(size);
    END IF;
END $$;