-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS ai_content_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  prompt TEXT NOT NULL,
  input_image_urls TEXT[] DEFAULT '{}',
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  result_urls TEXT[] DEFAULT '{}',
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: only admins (service role key bypasses RLS)
ALTER TABLE ai_content_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on ai_content_jobs"
  ON ai_content_jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ai_content_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_content_jobs_updated_at
  BEFORE UPDATE ON ai_content_jobs
  FOR EACH ROW EXECUTE FUNCTION update_ai_content_jobs_updated_at();
