-- Add featured column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Create index for better performance on featured products queries
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

-- Update some existing products to be featured for testing
UPDATE products SET featured = true WHERE id IN (
  SELECT id FROM products ORDER BY created_at DESC LIMIT 3
);