-- Add photo storage tables to existing schema

-- Photos table to store image metadata and link to survey responses
CREATE TABLE IF NOT EXISTS survey_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID REFERENCES survey_submissions(id) ON DELETE CASCADE,
    survey_category TEXT NOT NULL,
    question_key TEXT,
    room_number TEXT, -- for classroom entries
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- path in Supabase Storage
    file_size INTEGER,
    mime_type TEXT,
    caption TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add photo reference to survey responses
ALTER TABLE survey_responses 
ADD COLUMN IF NOT EXISTS has_photo BOOLEAN DEFAULT FALSE;

-- Add photo reference to classroom responses  
ALTER TABLE classroom_responses 
ADD COLUMN IF NOT EXISTS has_photo BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_photos_submission_id ON survey_photos(submission_id);
CREATE INDEX IF NOT EXISTS idx_survey_photos_survey_category ON survey_photos(survey_category);
CREATE INDEX IF NOT EXISTS idx_survey_photos_question_key ON survey_photos(question_key);
