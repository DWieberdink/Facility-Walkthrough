# Database Setup Instructions

## The Issue
The survey app is failing to start because the required database tables don't exist in Supabase. The error "Supabase error saving walker: {}" occurs because the `walkers` table hasn't been created yet.

## Quick Fix - Step by Step

### 1. Go to Your Supabase Dashboard
Open this URL in your browser: https://supabase.com/dashboard/project/qvpfvpyrgylfbwmbtobm

### 2. Navigate to SQL Editor
- Click "SQL Editor" in the left sidebar (it looks like a code icon)

### 3. Create a New Query
- Click the "New query" button

### 4. Copy the Setup Script
Copy the entire contents of this file: `scripts/setup-database-tables.sql`

Here's the script content:
```sql
-- Database setup script for survey application
-- Run this in your Supabase SQL Editor

-- Walker information table
CREATE TABLE IF NOT EXISTS walkers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
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

-- Regular survey responses for single-entry categories
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

-- Classroom entries for multi-entry categories
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_survey_responses_submission_id ON survey_responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_category ON survey_responses(survey_category);
CREATE INDEX IF NOT EXISTS idx_classroom_entries_submission_id ON classroom_entries(submission_id);
CREATE INDEX IF NOT EXISTS idx_classroom_entries_survey_category ON classroom_entries(survey_category);
CREATE INDEX IF NOT EXISTS idx_classroom_responses_classroom_entry_id ON classroom_responses(classroom_entry_id);
CREATE INDEX IF NOT EXISTS idx_walkers_email ON walkers(email);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_walker_id ON survey_submissions(walker_id);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_date_walked ON survey_submissions(date_walked);

-- Enable Row Level Security (RLS)
ALTER TABLE walkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to allow all operations (for development)
CREATE POLICY "Allow all operations on walkers" ON walkers FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_submissions" ON survey_submissions FOR ALL USING (true);
CREATE POLICY "Allow all operations on survey_responses" ON survey_responses FOR ALL USING (true);
CREATE POLICY "Allow all operations on classroom_entries" ON classroom_entries FOR ALL USING (true);
CREATE POLICY "Allow all operations on classroom_responses" ON classroom_responses FOR ALL USING (true);

-- Insert sample data for testing
INSERT INTO walkers (name, email, school) VALUES 
  ('Demo User', 'demo@example.com', 'Test School')
ON CONFLICT DO NOTHING;
```

### 5. Paste and Run
- Paste the script into the query editor
- Click the "Run" button (or press Ctrl+Enter)

### 6. Verify Success
You should see a success message and the tables should be created.

## Test the Setup
After running the script, test if it worked:

```bash
node scripts/test-database-connection.js
```

You should see "🎉 Database connection test passed!" if everything is working.

## Then Try the App Again
1. Restart your development server (stop and run `npm run dev` again)
2. Try starting the survey again - it should work now!

## Troubleshooting

### If you get "relation does not exist" error:
- Make sure you ran the entire script, not just part of it
- Check that you're in the correct Supabase project
- Try running the script again

### If you get permission errors:
- Make sure you're logged into the correct Supabase account
- Check that you have access to the project

### If the test script still fails:
- Double-check that the environment variables in `.env.local` are correct
- Make sure the Supabase project URL matches exactly

## What This Creates
The script creates these tables:
- `walkers` - stores walker information (name, email, school)
- `survey_submissions` - stores survey sessions
- `survey_responses` - stores regular survey responses
- `classroom_entries` - stores classroom-specific entries
- `classroom_responses` - stores classroom-specific responses 