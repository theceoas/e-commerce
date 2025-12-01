CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_products_count INTEGER;
  active_products_count INTEGER;
  total_orders_count INTEGER;
  total_revenue_amount NUMERIC;
BEGIN
  -- Get product stats
  SELECT COUNT(*), COUNT(*) FILTER (WHERE in_stock = true)
  INTO total_products_count, active_products_count
  FROM products;

  -- Get order stats
  SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
  INTO total_orders_count, total_revenue_amount
  FROM orders;

  RETURN json_build_object(
    'total_products', total_products_count,
    'active_products', active_products_count,
    'total_orders', total_orders_count,
    'total_revenue', total_revenue_amount
  );
END;
$$;
