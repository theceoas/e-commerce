-- Add missing type column to addresses table

ALTER TABLE addresses 
ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'Home';

-- Add constraint to ensure valid address types
ALTER TABLE addresses 
ADD CONSTRAINT addresses_type_check 
CHECK (type IN ('Home', 'Work', 'Billing', 'Shipping', 'Other'));

-- Create index for performance
CREATE INDEX idx_addresses_type ON addresses(type);

-- Update existing records to have a default type
UPDATE addresses SET type = 'Home' WHERE type IS NULL;