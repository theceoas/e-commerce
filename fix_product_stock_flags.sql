-- Fix existing products where in_stock is false but sizes have stock
UPDATE products
SET in_stock = true
WHERE in_stock = false
AND EXISTS (
  SELECT 1
  FROM jsonb_array_elements(sizes) AS size_item
  WHERE (size_item->>'stock')::int > 0
);

-- Also set in_stock to false for products with no stock in any size
UPDATE products
SET in_stock = false
WHERE in_stock = true
AND NOT EXISTS (
  SELECT 1
  FROM jsonb_array_elements(sizes) AS size_item
  WHERE (size_item->>'stock')::int > 0
);
