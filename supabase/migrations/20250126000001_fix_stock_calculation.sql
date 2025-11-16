-- Function to calculate if a product has stock based on sizes array
CREATE OR REPLACE FUNCTION calculate_product_stock(sizes_json JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- If sizes is null or empty array, consider out of stock
  IF sizes_json IS NULL OR jsonb_array_length(sizes_json) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if any size has stock > 0
  RETURN EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(sizes_json) AS size_obj
    WHERE (size_obj->>'stock')::INTEGER > 0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the products_with_discounts view to include calculated stock status
CREATE OR REPLACE VIEW products_with_discounts AS
SELECT 
  p.*,
  -- Override in_stock with calculated value based on sizes
  calculate_product_stock(p.sizes) AS in_stock_calculated,
  -- Keep original in_stock as manual override
  p.in_stock AS in_stock_manual,
  -- Use calculated stock unless manually overridden to false
  CASE 
    WHEN p.in_stock = FALSE THEN FALSE  -- Manual override to out of stock
    ELSE calculate_product_stock(p.sizes)  -- Use calculated stock
  END AS in_stock,
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

-- Create a trigger to automatically update in_stock when sizes change
CREATE OR REPLACE FUNCTION update_product_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update in_stock based on sizes, but only if it's not manually set to false
  IF NEW.in_stock != FALSE THEN
    NEW.in_stock = calculate_product_stock(NEW.sizes);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for products table
DROP TRIGGER IF EXISTS trigger_update_product_stock_status ON products;
CREATE TRIGGER trigger_update_product_stock_status
  BEFORE INSERT OR UPDATE OF sizes ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_status();

-- Update existing products to have correct stock status
UPDATE products 
SET in_stock = calculate_product_stock(sizes)
WHERE in_stock = TRUE;  -- Only update products that aren't manually set to out of stock