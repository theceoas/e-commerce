-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_brands_display_order ON brands(display_order);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(is_active);

-- Insert default brands (based on the image you showed)
INSERT INTO brands (name, image_url, description, display_order) VALUES
('Kiowa', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop', 'Bold & Contemporary - For the woman who commands attention through effortless confidence and modern sophistication.', 1),
('OmegeByfy', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=300&fit=crop', 'Elegant & Chic - Timeless pieces that blend classic style with contemporary flair.', 2),
('MiniMe', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&h=300&fit=crop', 'Fun & Playful - Adorable matching outfits for the little ones who love to shine.', 3);

-- Enable RLS (Row Level Security)
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read brands
CREATE POLICY "Anyone can view brands" ON brands
  FOR SELECT USING (true);

-- Create policy for admin users to manage brands
CREATE POLICY "Admin users can manage brands" ON brands
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('admin@favethings.com', 'admin@example.com')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();