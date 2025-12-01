-- Performance Optimization: Add database indexes for faster queries
-- Run this in your Supabase SQL Editor

-- Index for products table
-- Speeds up: ORDER BY created_at, filtering by brand_id, featured products
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);

-- Index for orders table  
-- Speeds up: ORDER BY created_at, filtering by user_id, status, payment_status
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email) WHERE guest_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Index for order_items table
-- Speeds up: JOIN with orders, filtering by product_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Index for cart_items table
-- Speeds up: filtering by user_id and session_id
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id) WHERE session_id IS NOT NULL;

-- Index for brands table
-- Speeds up: active brands queries, ordering by name
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- Index for addresses table
-- Speeds up: filtering by user_id, default address lookups
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_default ON addresses(user_id, is_default) WHERE is_default = true;

-- Index for shipping_zones table
-- Speeds up: active zones queries, ordering by price
CREATE INDEX IF NOT EXISTS idx_shipping_zones_is_active ON shipping_zones(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shipping_zones_price ON shipping_zones(price);

-- Vacuum analyze to update statistics after creating indexes
VACUUM ANALYZE products;
VACUUM ANALYZE orders;
VACUUM ANALYZE order_items;
VACUUM ANALYZE cart_items;
VACUUM ANALYZE brands;
VACUUM ANALYZE addresses;
VACUUM ANALYZE shipping_zones;

-- Performance monitoring: Check index usage after running for a few days
-- Uncomment and run this query to see if indexes are being used:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;
