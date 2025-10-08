-- Add foreign key constraint between products.brand_id and brands.id
-- This will enable proper joins between products and brands tables

-- First, update any existing products with invalid brand_id to NULL
UPDATE products 
SET brand_id = NULL 
WHERE brand_id IS NOT NULL 
AND brand_id NOT IN (SELECT id FROM brands);

-- Add the foreign key constraint
ALTER TABLE products 
ADD CONSTRAINT fk_products_brand_id 
FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;

-- Create index for better performance on brand_id lookups
CREATE INDEX IF NOT EXISTS idx_products_brand_id_fk ON products(brand_id);