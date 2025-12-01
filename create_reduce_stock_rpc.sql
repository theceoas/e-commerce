-- Function to safely reduce stock for multiple items
-- This runs with SECURITY DEFINER to bypass RLS, allowing guests to reduce stock
CREATE OR REPLACE FUNCTION reduce_stock(items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
  p_id uuid;
  p_size text;
  p_qty int;
  current_sizes jsonb;
  new_sizes jsonb;
BEGIN
  -- Loop through each item in the cart
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    p_id := (item->>'product_id')::uuid;
    p_size := item->>'size';
    p_qty := (item->>'quantity')::int;

    -- Get current sizes and lock the row
    SELECT sizes INTO current_sizes
    FROM products
    WHERE id = p_id
    FOR UPDATE;

    IF found THEN
      -- Reconstruct the sizes array with the updated stock
      SELECT jsonb_agg(
        CASE
          WHEN (elem->>'size') = p_size THEN
            jsonb_set(elem, '{stock}', to_jsonb(GREATEST(0, (elem->>'stock')::int - p_qty)))
          ELSE
            elem
        END
      )
      INTO new_sizes
      FROM jsonb_array_elements(current_sizes) AS elem;

      -- Update the product with the new sizes array
      UPDATE products
      SET sizes = new_sizes
      WHERE id = p_id;
    END IF;
  END LOOP;
END;
$$;
