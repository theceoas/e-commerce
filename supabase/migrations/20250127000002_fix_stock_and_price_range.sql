-- Fix stock calculation function to handle edge cases (nulls, string values, etc.)
CREATE OR REPLACE FUNCTION calculate_product_stock(sizes_json JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- If sizes is null or empty array, consider out of stock
  IF sizes_json IS NULL OR jsonb_array_length(sizes_json) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if any size has stock > 0
  -- Handle null values and invalid types gracefully
  RETURN EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(sizes_json) AS size_obj
    WHERE 
      size_obj->>'stock' IS NOT NULL
      AND (size_obj->>'stock')::TEXT ~ '^-?[0-9]+$'  -- Check if it's a valid number string
      AND (size_obj->>'stock')::INTEGER > 0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate price range for products with size-specific prices
CREATE OR REPLACE FUNCTION calculate_price_range(product_price DECIMAL, sizes_json JSONB)
RETURNS TEXT AS $$
DECLARE
  min_price DECIMAL;
  max_price DECIMAL;
  size_obj JSONB;
  size_price DECIMAL;
  has_size_prices BOOLEAN := FALSE;
BEGIN
  -- If sizes exist, check if any have prices
  IF sizes_json IS NOT NULL AND jsonb_array_length(sizes_json) > 0 THEN
    FOR size_obj IN SELECT * FROM jsonb_array_elements(sizes_json)
    LOOP
      -- Check if this size has a price
      IF size_obj->>'price' IS NOT NULL 
         AND (size_obj->>'price')::TEXT ~ '^-?[0-9]+\.?[0-9]*$' THEN
        size_price := (size_obj->>'price')::DECIMAL;
        has_size_prices := TRUE;
        
        -- Initialize min/max with first price, then update
        IF min_price IS NULL THEN
          min_price := size_price;
          max_price := size_price;
        ELSE
          IF size_price < min_price THEN
            min_price := size_price;
          END IF;
          IF size_price > max_price THEN
            max_price := size_price;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- Only return price range if we found size-specific prices
  -- If no size prices, return NULL so frontend can use base price
  IF NOT has_size_prices THEN
    RETURN NULL;
  END IF;
  
  -- Return formatted price range
  IF min_price = max_price THEN
    RETURN min_price::TEXT;
  ELSE
    RETURN min_price::TEXT || ' - ' || max_price::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop the existing view first to avoid column rename conflicts
DROP VIEW IF EXISTS products_with_discounts CASCADE;

-- Recreate the products_with_discounts view with calculated stock status and price range
-- We explicitly list all columns from products table EXCEPT in_stock (which we'll replace with calculated version)
CREATE VIEW products_with_discounts AS
SELECT 
  -- All columns from products table except in_stock (which we'll replace)
  p.id,
  p.name,
  p.description,
  p.price,
  p.thumbnail_url,
  p.additional_images,
  p.sizes,
  p.brand_id,
  p.featured,
  p.created_at,
  p.updated_at,
  p.discount_percentage,
  p.discount_amount,
  p.discount_start_date,
  p.discount_end_date,
  p.discount_active,
  -- Calculated columns
  -- Override in_stock with calculated value based on sizes
  calculate_product_stock(p.sizes) AS in_stock_calculated,
  -- Keep original in_stock as manual override
  p.in_stock AS in_stock_manual,
  -- Use calculated stock unless manually overridden to false (this is the main in_stock field)
  CASE 
    WHEN p.in_stock = FALSE THEN FALSE  -- Manual override to out of stock
    ELSE calculate_product_stock(p.sizes)  -- Use calculated stock
  END AS in_stock,
  -- Price range for products with size-specific prices
  calculate_price_range(p.price, p.sizes) AS price_range,
  -- Discount calculations
  get_discounted_price(
    p.price, 
    p.discount_percentage, 
    p.discount_amount, 
    p.discount_active,
    p.discount_start_date,
    p.discount_end_date
  ) AS discounted_price,
  CASE 
    WHEN p.discount_active = TRUE 
      AND (p.discount_start_date IS NULL OR NOW() >= p.discount_start_date)
      AND (p.discount_end_date IS NULL OR NOW() <= p.discount_end_date)
      AND (p.discount_percentage IS NOT NULL OR p.discount_amount IS NOT NULL)
    THEN TRUE 
    ELSE FALSE 
  END AS has_active_discount
FROM products p;

-- Recalculate stock status for ALL products (including those that were incorrectly marked as out of stock)
-- This fixes the issue where kiowa and omogebyify products show as out of stock
-- Update products that have stock but were incorrectly marked as out of stock
-- This will fix products where the stock calculation wasn't working properly
UPDATE products 
SET in_stock = calculate_product_stock(sizes)
WHERE calculate_product_stock(sizes) = TRUE;

-- Update the trigger to ensure stock is always calculated correctly
CREATE OR REPLACE FUNCTION update_product_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Always recalculate in_stock based on sizes, but respect manual override to FALSE
  -- If it was manually set to FALSE, keep it FALSE. Otherwise, calculate from sizes.
  IF OLD.in_stock = FALSE AND NEW.in_stock = FALSE THEN
    -- Keep manual override
    RETURN NEW;
  ELSE
    -- Calculate from sizes
    NEW.in_stock = calculate_product_stock(NEW.sizes);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_update_product_stock_status ON products;
CREATE TRIGGER trigger_update_product_stock_status
  BEFORE INSERT OR UPDATE OF sizes ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_status();

