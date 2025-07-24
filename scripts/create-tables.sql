-- Create walkers table
CREATE TABLE IF NOT EXISTS walkers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  school TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create survey_submissions table
CREATE TABLE IF NOT EXISTS survey_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  walker_id UUID REFERENCES walkers(id) ON DELETE CASCADE,
  date_walked DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create survey_responses table
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES survey_submissions(id) ON DELETE CASCADE,
  survey_category TEXT NOT NULL,
  question_key TEXT NOT NULL,
  question_text TEXT,
  item_index INTEGER DEFAULT 0,
  answer_choice TEXT NOT NULL,
  response TEXT NOT NULL,
  elaboration TEXT,
  category TEXT,
  subcategory TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classroom_entries table
CREATE TABLE IF NOT EXISTS classroom_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES survey_submissions(id) ON DELETE CASCADE,
  survey_category TEXT NOT NULL,
  room_number TEXT,
  grade_served TEXT,
  is_portable TEXT,
  ceiling_height TEXT,
  room_type TEXT,
  mode_of_instruction TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classroom_responses table
CREATE TABLE IF NOT EXISTS classroom_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_entry_id UUID REFERENCES classroom_entries(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_text TEXT,
  item_index INTEGER DEFAULT 0,
  answer_choice TEXT NOT NULL,
  response TEXT NOT NULL,
  elaboration TEXT,
  category TEXT,
  subcategory TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_walkers_email ON walkers(email);
CREATE INDEX IF NOT EXISTS idx_submissions_walker_date ON survey_submissions(walker_id, date_walked);
CREATE INDEX IF NOT EXISTS idx_responses_submission_category ON survey_responses(submission_id, survey_category);
CREATE INDEX IF NOT EXISTS idx_entries_submission_category ON classroom_entries(submission_id, survey_category);
CREATE INDEX IF NOT EXISTS idx_classroom_responses_entry ON classroom_responses(classroom_entry_id);

-- Enable Row Level Security
ALTER TABLE walkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for walkers
CREATE POLICY "Enable read access for all users" ON walkers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON walkers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON walkers FOR UPDATE USING (true);

-- Create RLS policies for survey_submissions
CREATE POLICY "Enable read access for all users" ON survey_submissions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON survey_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON survey_submissions FOR UPDATE USING (true);

-- Create RLS policies for survey_responses
CREATE POLICY "Enable read access for all users" ON survey_responses FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON survey_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON survey_responses FOR UPDATE USING (true);

-- Create RLS policies for classroom_entries
CREATE POLICY "Enable read access for all users" ON classroom_entries FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON classroom_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON classroom_entries FOR UPDATE USING (true);

-- Create RLS policies for classroom_responses
CREATE POLICY "Enable read access for all users" ON classroom_responses FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON classroom_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON classroom_responses FOR UPDATE USING (true);
