const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://qvpfvpyrgylfbwmbtobm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cGZ2cHlyZ3lsZmJ3bWJ0b2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODY0MDYsImV4cCI6MjA2ODk2MjQwNn0.aLAJinWwQ8e3DcNjYBBDm0Rx04u0pnm1Ury4pdn37l0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  console.log('Setting up database tables...')
  
  try {
    // Create walkers table
    console.log('\n1. Creating walkers table...')
    const { error: walkersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS walkers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          school TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (walkersError) {
      console.error('❌ Error creating walkers table:', walkersError)
    } else {
      console.log('✅ Walkers table created successfully')
    }

    // Create survey_submissions table
    console.log('\n2. Creating survey_submissions table...')
    const { error: submissionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS survey_submissions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          walker_id UUID REFERENCES walkers(id) ON DELETE CASCADE,
          date_walked DATE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (submissionsError) {
      console.error('❌ Error creating survey_submissions table:', submissionsError)
    } else {
      console.log('✅ Survey submissions table created successfully')
    }

    // Create survey_responses table
    console.log('\n3. Creating survey_responses table...')
    const { error: responsesError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    })
    
    if (responsesError) {
      console.error('❌ Error creating survey_responses table:', responsesError)
    } else {
      console.log('✅ Survey responses table created successfully')
    }

    // Create classroom_entries table
    console.log('\n4. Creating classroom_entries table...')
    const { error: entriesError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    })
    
    if (entriesError) {
      console.error('❌ Error creating classroom_entries table:', entriesError)
    } else {
      console.log('✅ Classroom entries table created successfully')
    }

    // Create classroom_responses table
    console.log('\n5. Creating classroom_responses table...')
    const { error: classroomResponsesError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    })
    
    if (classroomResponsesError) {
      console.error('❌ Error creating classroom_responses table:', classroomResponsesError)
    } else {
      console.log('✅ Classroom responses table created successfully')
    }

    // Create indexes
    console.log('\n6. Creating indexes...')
    const { error: indexesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_walkers_email ON walkers(email);
        CREATE INDEX IF NOT EXISTS idx_submissions_walker_date ON survey_submissions(walker_id, date_walked);
        CREATE INDEX IF NOT EXISTS idx_responses_submission_category ON survey_responses(submission_id, survey_category);
        CREATE INDEX IF NOT EXISTS idx_entries_submission_category ON classroom_entries(submission_id, survey_category);
        CREATE INDEX IF NOT EXISTS idx_classroom_responses_entry ON classroom_responses(classroom_entry_id);
      `
    })
    
    if (indexesError) {
      console.error('❌ Error creating indexes:', indexesError)
    } else {
      console.log('✅ Indexes created successfully')
    }

    console.log('\n🎉 Database setup completed!')

  } catch (error) {
    console.error('❌ General error:', error)
  }
}

setupDatabase() 