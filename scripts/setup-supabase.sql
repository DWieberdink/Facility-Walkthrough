-- Supabase Setup Script for Photo Upload Application
-- Run this in your Supabase SQL Editor

-- 1. Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('survey-photos', 'survey-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  walkers JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create survey_photos table
CREATE TABLE IF NOT EXISTS survey_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  survey_category TEXT NOT NULL,
  question_key TEXT,
  room_number TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  caption TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location_x DECIMAL(5,2),
  location_y DECIMAL(5,2),
  floor_level TEXT CHECK (floor_level IN ('first', 'second')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_survey_photos_submission_id ON survey_photos(submission_id);
CREATE INDEX IF NOT EXISTS idx_survey_photos_survey_category ON survey_photos(survey_category);
CREATE INDEX IF NOT EXISTS idx_survey_photos_floor_level ON survey_photos(floor_level);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_photos ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for submissions
CREATE POLICY "Allow all operations on submissions" ON submissions
  FOR ALL USING (true);

-- 7. Create RLS policies for survey_photos
CREATE POLICY "Allow all operations on survey_photos" ON survey_photos
  FOR ALL USING (true);

-- 8. Create storage policies for the bucket
CREATE POLICY "Allow public read access to survey photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'survey-photos');

CREATE POLICY "Allow authenticated uploads to survey photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'survey-photos');

CREATE POLICY "Allow authenticated updates to survey photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'survey-photos');

CREATE POLICY "Allow authenticated deletes from survey photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'survey-photos');

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create triggers to automatically update updated_at
CREATE TRIGGER update_submissions_updated_at 
  BEFORE UPDATE ON submissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_photos_updated_at 
  BEFORE UPDATE ON survey_photos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert some sample data for testing
INSERT INTO submissions (walkers) VALUES 
  ('{"name": "Demo User", "email": "demo@example.com", "school": "Admin Building"}')
ON CONFLICT DO NOTHING; 