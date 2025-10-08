-- Remove category column from products table since it's no longer used
ALTER TABLE products DROP COLUMN IF EXISTS category;