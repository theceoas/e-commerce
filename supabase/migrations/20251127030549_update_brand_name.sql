-- Update the "Others" brand to "Favorite Things"
UPDATE brands
SET name = 'Favorite Things'
WHERE LOWER(name) = 'others';
