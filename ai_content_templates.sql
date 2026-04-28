-- Run in Supabase SQL editor

-- Templates table (model reference photos)
CREATE TABLE IF NOT EXISTS ai_content_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  reference_image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_content_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access ai_content_templates" ON ai_content_templates FOR ALL USING (true) WITH CHECK (true);

-- Add template_id and dress_length to jobs table
ALTER TABLE ai_content_jobs ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES ai_content_templates(id) ON DELETE SET NULL;
ALTER TABLE ai_content_jobs ADD COLUMN IF NOT EXISTS dress_length TEXT;
