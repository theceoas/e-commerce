-- Add discount fields to products table
ALTER TABLE products 
ADD COLUMN discount_percentage DECIMAL(5,2) CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN discount_amount DECIMAL(10,2) CHECK (discount_amount >= 0),
ADD COLUMN discount_start_date TIMESTAMPTZ,
ADD COLUMN discount_end_date TIMESTAMPTZ,
ADD COLUMN discount_active BOOLEAN DEFAULT FALSE;

-- Add constraint to ensure only one discount type is used
ALTER TABLE products 
ADD CONSTRAINT check_discount_type 
CHECK (
  (discount_percentage IS NULL AND discount_amount IS NULL) OR
  (discount_percentage IS NOT NULL AND discount_amount IS NULL) OR
  (discount_percentage IS NULL AND discount_amount IS NOT NULL)
);

-- Add constraint to ensure end date is after start date
ALTER TABLE products 
ADD CONSTRAINT check_discount_dates 
CHECK (discount_end_date IS NULL OR discount_start_date IS NULL OR discount_end_date > discount_start_date);

-- Create function to calculate discounted price
CREATE OR REPLACE FUNCTION get_discounted_price(
  original_price DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  discount_active BOOLEAN,
  discount_start_date TIMESTAMPTZ,
  discount_end_date TIMESTAMPTZ
) RETURNS DECIMAL(10,2) AS $$
BEGIN
  -- Check if discount is active and within date range
  IF NOT COALESCE(discount_active, FALSE) THEN
    RETURN original_price;
  END IF;
  
  IF discount_start_date IS NOT NULL AND NOW() < discount_start_date THEN
    RETURN original_price;
  END IF;
  
  IF discount_end_date IS NOT NULL AND NOW() > discount_end_date THEN
    RETURN original_price;
  END IF;
  
  -- Apply percentage discount
  IF discount_percentage IS NOT NULL THEN
    RETURN ROUND(original_price * (1 - discount_percentage / 100), 2);
  END IF;
  
  -- Apply amount discount
  IF discount_amount IS NOT NULL THEN
    RETURN GREATEST(0, original_price - discount_amount);
  END IF;
  
  -- No discount
  RETURN original_price;
END;
$$ LANGUAGE plpgsql;

-- Create view for products with calculated discount info
CREATE OR REPLACE VIEW products_with_discounts AS
SELECT 
  p.*,
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