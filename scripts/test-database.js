const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://qvpfvpyrgylfbwmbtobm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cGZ2cHlyZ3lsZmJ3bWJ0b2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODY0MDYsImV4cCI6MjA2ODk2MjQwNn0.aLAJinWwQ8e3DcNjYBBDm0Rx04u0pnm1Ury4pdn37l0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  console.log('Testing database connection...')
  
  try {
    // Test 1: Check if walkers table exists
    console.log('\n1. Testing walkers table...')
    const { data: walkers, error: walkersError } = await supabase
      .from('walkers')
      .select('*')
      .limit(1)
    
    if (walkersError) {
      console.error('❌ Walkers table error:', walkersError)
    } else {
      console.log('✅ Walkers table exists and is accessible')
    }

    // Test 2: Check if survey_submissions table exists
    console.log('\n2. Testing survey_submissions table...')
    const { data: submissions, error: submissionsError } = await supabase
      .from('survey_submissions')
      .select('*')
      .limit(1)
    
    if (submissionsError) {
      console.error('❌ Survey submissions table error:', submissionsError)
    } else {
      console.log('✅ Survey submissions table exists and is accessible')
    }

    // Test 3: Check if survey_photos table exists
    console.log('\n3. Testing survey_photos table...')
    const { data: photos, error: photosError } = await supabase
      .from('survey_photos')
      .select('*')
      .limit(1)
    
    if (photosError) {
      console.error('❌ Survey photos table error:', photosError)
    } else {
      console.log('✅ Survey photos table exists and is accessible')
    }

    // Test 4: Try to insert a test walker
    console.log('\n4. Testing walker insertion...')
    const { data: testWalker, error: insertError } = await supabase
      .from('walkers')
      .insert({
        name: 'Test Walker',
        email: 'test@example.com',
        school: 'Test Building'
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Walker insertion error:', insertError)
    } else {
      console.log('✅ Walker insertion successful:', testWalker)
      
      // Clean up test data
      await supabase
        .from('walkers')
        .delete()
        .eq('id', testWalker.id)
      console.log('✅ Test data cleaned up')
    }

  } catch (error) {
    console.error('❌ General error:', error)
  }
}

testDatabase() 