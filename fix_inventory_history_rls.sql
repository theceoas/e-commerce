-- Fix RLS policies for inventory_history table
-- This allows the reduce_stock RPC to log inventory changes

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow service role to insert inventory history" ON inventory_history;
DROP POLICY IF EXISTS "Allow authenticated users to view inventory history" ON inventory_history;

-- Enable RLS
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

-- Allow the reduce_stock function to insert (it runs as SECURITY DEFINER)
CREATE POLICY "Allow service role to insert inventory history"
ON inventory_history
FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated users to view inventory history
CREATE POLICY "Allow authenticated users to view inventory history"
ON inventory_history
FOR SELECT
TO authenticated
USING (true);
