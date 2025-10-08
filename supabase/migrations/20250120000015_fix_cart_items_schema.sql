-- Simple migration to add size column to cart_items table
-- Only add the column if it doesn't exist

DO $$ 
BEGIN
    -- Add size column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cart_items' 
        AND column_name = 'size'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN size TEXT;
        
        -- Add index for better performance on size column
        CREATE INDEX IF NOT EXISTS idx_cart_items_size ON public.cart_items(size);
    END IF;
END $$;