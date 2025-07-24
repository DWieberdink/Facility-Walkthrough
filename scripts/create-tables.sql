-- Create tables for the survey application

-- Walker information table
CREATE TABLE IF NOT EXISTS walkers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    school TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Survey submissions table
CREATE TABLE IF NOT EXISTS survey_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    walker_id UUID REFERENCES walkers(id) ON DELETE CASCADE,
    date_walked DATE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regular survey responses (non-classroom categories)
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

-- Classroom entries table (for multi-entry categories)
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

-- Classroom responses table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_survey_responses_submission_id ON survey_responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_category ON survey_responses(survey_category);
CREATE INDEX IF NOT EXISTS idx_classroom_entries_submission_id ON classroom_entries(submission_id);
CREATE INDEX IF NOT EXISTS idx_classroom_responses_classroom_entry_id ON classroom_responses(classroom_entry_id);
CREATE INDEX IF NOT EXISTS idx_walkers_email ON walkers(email);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_walker_id ON survey_submissions(walker_id);
