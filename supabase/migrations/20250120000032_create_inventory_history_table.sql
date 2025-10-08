-- Create inventory_history table to track stock changes
CREATE TABLE inventory_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(10) NOT NULL,
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('adjustment', 'sale', 'restock', 'return')),
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  quantity_changed INTEGER NOT NULL,
  reason TEXT,
  user_id UUID REFERENCES auth.users(id),
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_inventory_history_product_id ON inventory_history(product_id);
CREATE INDEX idx_inventory_history_created_at ON inventory_history(created_at);
CREATE INDEX idx_inventory_history_change_type ON inventory_history(change_type);

-- Enable RLS
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can view all inventory history" ON inventory_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@favethings.ng'
    )
  );

CREATE POLICY "Admin can insert inventory history" ON inventory_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@favethings.ng'
    )
  );

-- Function to automatically log inventory changes when sizes JSONB is updated
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
  old_size JSONB;
  new_size JSONB;
  size_item JSONB;
  size_key TEXT;
  old_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Only log if sizes changed
  IF OLD.sizes != NEW.sizes THEN
    -- Iterate through each size in the new sizes array
    FOR size_item IN SELECT jsonb_array_elements(NEW.sizes)
    LOOP
      size_key := size_item->>'size';
      new_stock := (size_item->>'stock_quantity')::integer;
      
      -- Find the corresponding old size
      SELECT (elem->>'stock_quantity')::integer INTO old_stock
      FROM jsonb_array_elements(OLD.sizes) AS elem
      WHERE elem->>'size' = size_key;
      
      -- If stock changed for this size, log it
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

-- Create trigger to automatically log inventory changes
CREATE TRIGGER trigger_log_inventory_change
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory_change();