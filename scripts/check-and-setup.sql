-- Check and Setup Script for Supabase
-- This script will only create what's missing

-- 1. Check if storage bucket exists, create if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'survey-photos') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('survey-photos', 'survey-photos', true);
    RAISE NOTICE 'Created survey-photos bucket';
  ELSE
    RAISE NOTICE 'survey-photos bucket already exists';
  END IF;
END $$;

-- 2. Check if submissions table exists, create if not
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  walkers JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Check if survey_photos table exists, create if not
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

-- 4. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_survey_photos_submission_id ON survey_photos(submission_id);
CREATE INDEX IF NOT EXISTS idx_survey_photos_survey_category ON survey_photos(survey_category);
CREATE INDEX IF NOT EXISTS idx_survey_photos_floor_level ON survey_photos(floor_level);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);

-- 5. Enable RLS if not already enabled
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_photos ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Allow all operations on submissions') THEN
    CREATE POLICY "Allow all operations on submissions" ON submissions FOR ALL USING (true);
    RAISE NOTICE 'Created submissions policy';
  ELSE
    RAISE NOTICE 'submissions policy already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_photos' AND policyname = 'Allow all operations on survey_photos') THEN
    CREATE POLICY "Allow all operations on survey_photos" ON survey_photos FOR ALL USING (true);
    RAISE NOTICE 'Created survey_photos policy';
  ELSE
    RAISE NOTICE 'survey_photos policy already exists';
  END IF;
END $$;

-- 7. Create storage policies only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public read access to survey photos') THEN
    CREATE POLICY "Allow public read access to survey photos" ON storage.objects FOR SELECT USING (bucket_id = 'survey-photos');
    RAISE NOTICE 'Created storage read policy';
  ELSE
    RAISE NOTICE 'storage read policy already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow authenticated uploads to survey photos') THEN
    CREATE POLICY "Allow authenticated uploads to survey photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'survey-photos');
    RAISE NOTICE 'Created storage upload policy';
  ELSE
    RAISE NOTICE 'storage upload policy already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow authenticated updates to survey photos') THEN
    CREATE POLICY "Allow authenticated updates to survey photos" ON storage.objects FOR UPDATE USING (bucket_id = 'survey-photos');
    RAISE NOTICE 'Created storage update policy';
  ELSE
    RAISE NOTICE 'storage update policy already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow authenticated deletes from survey photos') THEN
    CREATE POLICY "Allow authenticated deletes from survey photos" ON storage.objects FOR DELETE USING (bucket_id = 'survey-photos');
    RAISE NOTICE 'Created storage delete policy';
  ELSE
    RAISE NOTICE 'storage delete policy already exists';
  END IF;
END $$;

-- 8. Create function to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers if they don't exist
DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at 
  BEFORE UPDATE ON submissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_survey_photos_updated_at ON survey_photos;
CREATE TRIGGER update_survey_photos_updated_at 
  BEFORE UPDATE ON survey_photos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Insert sample data if submissions table is empty
INSERT INTO submissions (walkers) 
SELECT '{"name": "Demo User", "email": "demo@example.com", "school": "Admin Building"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM submissions LIMIT 1);

-- 11. Show current status
SELECT 
  'Database Setup Complete!' as status,
  (SELECT COUNT(*) FROM submissions) as submissions_count,
  (SELECT COUNT(*) FROM survey_photos) as photos_count,
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'survey-photos') as bucket_exists; 