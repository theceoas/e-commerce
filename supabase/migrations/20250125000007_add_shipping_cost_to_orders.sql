-- Add shipping_cost column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0.00;

-- Add shipping_zone_id column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zone_id UUID REFERENCES shipping_zones(id);

-- Update existing orders to have default shipping cost
UPDATE orders SET shipping_cost = 0.00 WHERE shipping_cost IS NULL;