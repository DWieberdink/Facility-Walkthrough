-- Clean Rebuild of Photo Tables with Building Support
-- Run this in your Supabase SQL Editor
-- WARNING: This will delete all existing photos and recreate the tables

-- First, let's check if survey_submissions exists, if not create it
CREATE TABLE IF NOT EXISTS survey_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    walker_id UUID REFERENCES walkers(id) ON DELETE CASCADE,
    date_walked DATE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop the existing survey_photos table if it exists (to fix the foreign key)
DROP TABLE IF EXISTS survey_photos CASCADE;

-- Create the survey_photos table with correct foreign key reference and building column
CREATE TABLE survey_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID REFERENCES survey_submissions(id) ON DELETE CASCADE,
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
    floor_level TEXT CHECK (floor_level IN ('basement', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth')),
    building TEXT NOT NULL DEFAULT 'Unknown Building',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_survey_photos_submission_id ON survey_photos(submission_id);
CREATE INDEX IF NOT EXISTS idx_survey_photos_survey_category ON survey_photos(survey_category);
CREATE INDEX IF NOT EXISTS idx_survey_photos_floor_level ON survey_photos(floor_level);
CREATE INDEX IF NOT EXISTS idx_survey_photos_building ON survey_photos(building);
CREATE INDEX IF NOT EXISTS idx_survey_photos_building_floor ON survey_photos(building, floor_level);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_walker_id ON survey_submissions(walker_id);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_date_walked ON survey_submissions(date_walked);

-- Add comments to explain the columns
COMMENT ON COLUMN survey_photos.building IS 'Building name where photo was taken (derived from walker school)';
COMMENT ON COLUMN survey_photos.floor_level IS 'Floor level where photo was taken';
COMMENT ON COLUMN survey_photos.location_x IS 'X coordinate on floorplan (0-100%)';
COMMENT ON COLUMN survey_photos.location_y IS 'Y coordinate on floorplan (0-100%)';

-- Enable Row Level Security (RLS)
ALTER TABLE survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Allow all operations on survey_submissions" ON survey_submissions;
DROP POLICY IF EXISTS "Allow all operations on survey_photos" ON survey_photos;

-- Create RLS policies to allow all operations (for development)
CREATE POLICY "Allow all operations on survey_submissions" ON survey_submissions FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_photos" ON survey_photos FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_survey_photos_updated_at ON survey_photos;
CREATE TRIGGER update_survey_photos_updated_at 
  BEFORE UPDATE ON survey_photos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('survey-photos', 'survey-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Allow public read access to survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to survey photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from survey photos" ON storage.objects;

-- Create storage policies for the bucket
CREATE POLICY "Allow public read access to survey photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'survey-photos');

CREATE POLICY "Allow authenticated uploads to survey photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'survey-photos');

CREATE POLICY "Allow authenticated updates to survey photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'survey-photos');

CREATE POLICY "Allow authenticated deletes from survey photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'survey-photos');

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'survey_photos' 
ORDER BY ordinal_position; 