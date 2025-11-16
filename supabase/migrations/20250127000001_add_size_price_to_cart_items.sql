-- Add size_price column to cart_items table to support size-based pricing
-- This allows storing the price at the time of adding to cart for MiniMe products

DO $$ 
BEGIN
    -- Add size_price column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cart_items' 
        AND column_name = 'size_price'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.cart_items ADD COLUMN size_price DECIMAL(10,2);
        
        -- Add comment to explain the column
        COMMENT ON COLUMN public.cart_items.size_price IS 'Price for the specific size (used for MiniMe products with size-based pricing). If NULL, use product base price.';
    END IF;
END $$;

