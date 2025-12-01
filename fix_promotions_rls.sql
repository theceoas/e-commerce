-- Fix RLS policies for promotions table
-- This allows admins to create, update, and delete promotions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can insert promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can update promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can delete promotions" ON promotions;
DROP POLICY IF EXISTS "Users can view active promotions" ON promotions;

-- Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Policy for admins to insert promotions
CREATE POLICY "Admins can insert promotions"
ON promotions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy for admins to update promotions
CREATE POLICY "Admins can update promotions"
ON promotions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy for admins to delete promotions
CREATE POLICY "Admins can delete promotions"
ON promotions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy for admins to view all promotions
CREATE POLICY "Admins can view all promotions"
ON promotions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy for authenticated users to view active promotions for validation
CREATE POLICY "Users can view active promotions"
ON promotions
FOR SELECT
TO authenticated
USING (is_active = true);
