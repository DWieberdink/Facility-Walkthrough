const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://qvpfvpyrgylfbwmbtobm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cGZ2cHlyZ3lsZmJ3bWJ0b2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODY0MDYsImV4cCI6MjA2ODk2MjQwNn0.aLAJinWwQ8e3DcNjYBBDm0Rx04u0pnm1Ury4pdn37l0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  
  try {
    // Test 1: Check if survey_photos table exists and get its structure
    console.log('\n1. Checking survey_photos table structure...')
    const { data: photos, error: photosError } = await supabase
      .from('survey_photos')
      .select('*')
      .limit(5)
    
    if (photosError) {
      console.error('❌ Error accessing survey_photos table:', photosError)
    } else {
      console.log('✅ survey_photos table accessible')
      console.log('Sample photo data:', photos?.[0] ? Object.keys(photos[0]) : 'No photos found')
      if (photos?.[0]) {
        console.log('Photo columns:', Object.keys(photos[0]))
      }
    }

    // Test 2: Check if building column exists
    console.log('\n2. Checking if building column exists...')
    const { data: buildingTest, error: buildingError } = await supabase
      .from('survey_photos')
      .select('building')
      .limit(1)
    
    if (buildingError && buildingError.code === '42703') {
      console.log('❌ Building column does not exist')
    } else if (buildingError) {
      console.error('❌ Error checking building column:', buildingError)
    } else {
      console.log('✅ Building column exists')
    }

    // Test 3: Check walkers table
    console.log('\n3. Checking walkers table...')
    const { data: walkers, error: walkersError } = await supabase
      .from('walkers')
      .select('id, name, school')
      .limit(5)
    
    if (walkersError) {
      console.error('❌ Error accessing walkers table:', walkersError)
    } else {
      console.log('✅ walkers table accessible')
      console.log('Sample walkers:', walkers?.map(w => ({ name: w.name, school: w.school })))
    }

    // Test 4: Check survey_submissions table
    console.log('\n4. Checking survey_submissions table...')
    const { data: submissions, error: submissionsError } = await supabase
      .from('survey_submissions')
      .select('id, walker_id, date_walked')
      .limit(5)
    
    if (submissionsError) {
      console.error('❌ Error accessing survey_submissions table:', submissionsError)
    } else {
      console.log('✅ survey_submissions table accessible')
      console.log('Sample submissions:', submissions?.length || 0, 'found')
    }

    // Test 5: Check floor_plans table
    console.log('\n5. Checking floor_plans table...')
    const { data: floorPlans, error: floorPlansError } = await supabase
      .from('floor_plans')
      .select('building_name, floor_level')
      .limit(5)
    
    if (floorPlansError) {
      console.error('❌ Error accessing floor_plans table:', floorPlansError)
    } else {
      console.log('✅ floor_plans table accessible')
      console.log('Sample floor plans:', floorPlans?.map(fp => ({ building: fp.building_name, floor: fp.floor_level })))
    }

    console.log('\n🎉 Database connection test completed!')
    
  } catch (error) {
    console.error('❌ Error during database test:', error)
  }
}

// Run the test
testDatabaseConnection() 