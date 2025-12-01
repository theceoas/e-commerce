-- Check if MINIME products have size prices stored
SELECT 
  id,
  name,
  price as base_price,
  sizes,
  jsonb_array_elements(sizes) as size_detail
FROM products
WHERE name ILIKE '%minime%'
LIMIT 5;
