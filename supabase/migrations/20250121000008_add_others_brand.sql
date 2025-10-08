-- Add Others brand for snacks and miscellaneous products
INSERT INTO brands (name, image_url, description, display_order) 
SELECT 'Others', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop&crop=center', 'Treats & Delights - Discover our curated selection of premium snacks, treats, and lifestyle products that add joy to your everyday moments.', 4
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Others');