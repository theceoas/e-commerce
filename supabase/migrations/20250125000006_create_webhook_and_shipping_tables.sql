-- Create webhook_configs table
CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('purchase', 'promotion_created', 'shipping_update')),
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  secret_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipping_zones table
CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for webhook_configs (admin only)
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage webhook configs" ON webhook_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Add RLS policies for shipping_zones (admin can manage, users can read active zones)
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage shipping zones" ON shipping_zones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view active shipping zones" ON shipping_zones
  FOR SELECT USING (is_active = true);

-- Add updated_at trigger for webhook_configs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_webhook_configs_updated_at 
  BEFORE UPDATE ON webhook_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_zones_updated_at 
  BEFORE UPDATE ON shipping_zones 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default shipping zones
INSERT INTO shipping_zones (name, price, description, is_active) VALUES
  ('Local Delivery', 5.00, 'Same-day delivery within city limits', true),
  ('Standard Shipping', 10.00, '3-5 business days delivery', true),
  ('Express Shipping', 25.00, '1-2 business days delivery', true),
  ('International', 50.00, '7-14 business days international delivery', true)
ON CONFLICT DO NOTHING;