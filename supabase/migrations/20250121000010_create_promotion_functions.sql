-- Function to increment promotion usage count
CREATE OR REPLACE FUNCTION increment_promotion_usage(promotion_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE promotions 
  SET used_count = used_count + 1 
  WHERE id = promotion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get promotion statistics
CREATE OR REPLACE FUNCTION get_promotion_stats(promotion_id UUID)
RETURNS TABLE (
  total_uses BIGINT,
  total_discount_amount NUMERIC,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_uses,
    COALESCE(SUM(discount_amount), 0) as total_discount_amount,
    COUNT(DISTINCT user_id) as unique_users
  FROM promotion_usage 
  WHERE promotion_usage.promotion_id = get_promotion_stats.promotion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use promotion
CREATE OR REPLACE FUNCTION can_user_use_promotion(
  promotion_id UUID,
  user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  max_uses INTEGER;
  current_uses INTEGER;
BEGIN
  -- Get max uses per user for this promotion
  SELECT max_uses_per_user INTO max_uses
  FROM promotions 
  WHERE id = promotion_id;
  
  -- Get current uses by this user
  SELECT COUNT(*) INTO current_uses
  FROM promotion_usage 
  WHERE promotion_usage.promotion_id = can_user_use_promotion.promotion_id 
    AND promotion_usage.user_id = can_user_use_promotion.user_id;
  
  -- Return true if user can still use the promotion
  RETURN current_uses < max_uses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;