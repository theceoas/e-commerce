-- Fix the inventory history trigger function to avoid PostgreSQL compatibility issues
-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_log_inventory_change ON products;
DROP FUNCTION IF EXISTS log_inventory_change();

-- Create an improved function that handles JSONB operations more safely
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
  old_size_item JSONB;
  new_size_item JSONB;
  size_key TEXT;
  old_stock INTEGER;
  new_stock INTEGER;
  i INTEGER;
BEGIN
  -- Only log if sizes changed
  IF OLD.sizes IS DISTINCT FROM NEW.sizes THEN
    -- Iterate through each size in the new sizes array
    FOR i IN 0..jsonb_array_length(NEW.sizes) - 1
    LOOP
      new_size_item := NEW.sizes->i;
      size_key := new_size_item->>'size';
      new_stock := COALESCE((new_size_item->>'stock')::integer, 0);
      
      -- Find the corresponding old size by iterating through old sizes
      old_stock := NULL;
      FOR j IN 0..COALESCE(jsonb_array_length(OLD.sizes), 0) - 1
      LOOP
        old_size_item := OLD.sizes->j;
        IF old_size_item->>'size' = size_key THEN
          old_stock := COALESCE((old_size_item->>'stock')::integer, 0);
          EXIT;
        END IF;
      END LOOP;
      
      -- If we found a matching old size and stock changed, log it
      IF old_stock IS NOT NULL AND old_stock != new_stock THEN
        INSERT INTO inventory_history (
          product_id,
          size,
          change_type,
          quantity_before,
          quantity_after,
          quantity_changed,
          reason,
          user_id
        ) VALUES (
          NEW.id,
          size_key,
          'adjustment',
          old_stock,
          new_stock,
          new_stock - old_stock,
          'Manual adjustment',
          auth.uid()
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_log_inventory_change
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory_change();