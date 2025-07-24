-- Complete database schema for ALL survey categories
-- This handles both multi-entry categories (classrooms) and regular single-entry categories

-- Walker information table
CREATE TABLE IF NOT EXISTS walkers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    school TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey submissions table (one per walker per session)
CREATE TABLE IF NOT EXISTS survey_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    walker_id UUID REFERENCES walkers(id) ON DELETE CASCADE,
    date_walked DATE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regular survey responses for single-entry categories like:
-- Cafeteria, Kitchen, Gymnasium, Library, Auditorium, Main Office, etc.
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID REFERENCES survey_submissions(id) ON DELETE CASCADE,
    survey_category TEXT NOT NULL,
    question_key TEXT NOT NULL,
    question_text TEXT NOT NULL,
    item_index INTEGER NOT NULL,
    answer_choice TEXT NOT NULL,
    response TEXT NOT NULL CHECK (response IN ('Yes', 'No', 'Does Not Apply', 'Not Able to View')),
    elaboration TEXT,
    category TEXT,
    subcategory TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classroom entries for multi-entry categories:
-- "Classrooms", "Specialized Classrooms", "Special Education Classrooms"
CREATE TABLE IF NOT EXISTS classroom_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID REFERENCES survey_submissions(id) ON DELETE CASCADE,
    survey_category TEXT NOT NULL,
    room_number TEXT NOT NULL,
    grade_served TEXT NOT NULL,
    is_portable BOOLEAN NOT NULL,
    ceiling_height TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classroom responses for the multi-entry categories
CREATE TABLE IF NOT EXISTS classroom_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_entry_id UUID REFERENCES classroom_entries(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    question_text TEXT NOT NULL,
    item_index INTEGER NOT NULL,
    answer_choice TEXT NOT NULL,
    response TEXT NOT NULL CHECK (response IN ('Yes', 'No', 'Does Not Apply', 'Not Able to View')),
    elaboration TEXT,
    category TEXT,
    subcategory TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey categories reference table (optional - for documentation)
CREATE TABLE IF NOT EXISTS survey_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_multi_entry BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert all known survey categories
INSERT INTO survey_categories (name, is_multi_entry, description) VALUES
('Classrooms', TRUE, 'Regular classroom spaces requiring room details'),
('Specialized Classrooms', TRUE, 'Specialized learning spaces requiring room details'),
('Special Education Classrooms', TRUE, 'Special education spaces requiring room details'),
('Cafeteria', FALSE, 'Dining and food service areas'),
('Kitchen', FALSE, 'Food preparation areas'),
('Gymnasium', FALSE, 'Physical education and sports facilities'),
('Library/Media Center', FALSE, 'Library and media resources'),
('Auditorium', FALSE, 'Large assembly and performance spaces'),
('Main Office', FALSE, 'Administrative office areas'),
('Nurse''s Office', FALSE, 'Health and medical facilities'),
('Counselor''s Office', FALSE, 'Student counseling facilities'),
('Principal''s Office', FALSE, 'Principal administrative space'),
('Teacher Workroom/Lounge', FALSE, 'Staff work and break areas'),
('Storage Areas', FALSE, 'Storage and supply spaces'),
('Restrooms', FALSE, 'Restroom facilities'),
('Hallways/Corridors', FALSE, 'Circulation and corridor spaces'),
('Stairwells', FALSE, 'Stairway and vertical circulation'),
('Exterior Areas', FALSE, 'Outdoor building areas'),
('Parking Areas', FALSE, 'Vehicle parking facilities'),
('Playground/Outdoor Recreation', FALSE, 'Outdoor recreational spaces'),
('Building Entrance/Exit', FALSE, 'Entry and exit points'),
('HVAC/Mechanical Rooms', FALSE, 'Mechanical and utility spaces'),
('Custodial Areas', FALSE, 'Maintenance and custodial facilities')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_survey_responses_submission_id ON survey_responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_category ON survey_responses(survey_category);
CREATE INDEX IF NOT EXISTS idx_classroom_entries_submission_id ON classroom_entries(submission_id);
CREATE INDEX IF NOT EXISTS idx_classroom_entries_survey_category ON classroom_entries(survey_category);
CREATE INDEX IF NOT EXISTS idx_classroom_responses_classroom_entry_id ON classroom_responses(classroom_entry_id);
CREATE INDEX IF NOT EXISTS idx_walkers_email ON walkers(email);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_walker_id ON survey_submissions(walker_id);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_date_walked ON survey_submissions(date_walked);

-- Create a view to see all survey data together
CREATE OR REPLACE VIEW survey_data_complete AS
SELECT 
    ss.id as submission_id,
    w.name as walker_name,
    w.email as walker_email,
    w.school,
    ss.date_walked,
    'regular' as entry_type,
    sr.survey_category,
    NULL as room_number,
    NULL as grade_served,
    NULL as is_portable,
    NULL as ceiling_height,
    sr.question_key,
    sr.question_text,
    sr.answer_choice,
    sr.response,
    sr.elaboration,
    sr.category,
    sr.subcategory
FROM survey_submissions ss
JOIN walkers w ON ss.walker_id = w.id
JOIN survey_responses sr ON ss.id = sr.submission_id

UNION ALL

SELECT 
    ss.id as submission_id,
    w.name as walker_name,
    w.email as walker_email,
    w.school,
    ss.date_walked,
    'classroom' as entry_type,
    ce.survey_category,
    ce.room_number,
    ce.grade_served,
    ce.is_portable,
    ce.ceiling_height,
    cr.question_key,
    cr.question_text,
    cr.answer_choice,
    cr.response,
    cr.elaboration,
    cr.category,
    cr.subcategory
FROM survey_submissions ss
JOIN walkers w ON ss.walker_id = w.id
JOIN classroom_entries ce ON ss.id = ce.submission_id
JOIN classroom_responses cr ON ce.id = cr.classroom_entry_id;
