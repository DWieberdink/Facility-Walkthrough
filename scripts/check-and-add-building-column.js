const { createClient } = require('@supabase/supabase-js')

// Supabase configuration (using same credentials as test script)
const supabaseUrl = 'https://qvpfvpyrgylfbwmbtobm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cGZ2cHlyZ3lsZmJ3bWJ0b2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODY0MDYsImV4cCI6MjA2ODk2MjQwNn0.aLAJinWwQ8e3DcNjYBBDm0Rx04u0pnm1Ury4pdn37l0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndAddBuildingColumn() {
  console.log('🔍 Checking if building column exists in survey_photos table...')
  
  try {
    // First, let's check if the column exists by trying to select it
    const { data: testData, error: testError } = await supabase
      .from('survey_photos')
      .select('building')
      .limit(1)
    
    if (testError && testError.code === '42703') {
      console.log('❌ Building column does not exist. Adding it now...')
      
      // Add the building column
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE survey_photos 
          ADD COLUMN building TEXT;
        `
      })
      
      if (alterError) {
        console.error('❌ Error adding building column:', alterError)
        return
      }
      
      console.log('✅ Building column added successfully')
      
      // Add comment
      const { error: commentError } = await supabase.rpc('exec_sql', {
        sql: `
          COMMENT ON COLUMN survey_photos.building IS 'Building name where photo was taken (derived from walker school)';
        `
      })
      
      if (commentError) {
        console.warn('⚠️  Warning: Could not add comment:', commentError)
      } else {
        console.log('✅ Comment added successfully')
      }
      
      // Create index
      const { error: indexError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE INDEX IF NOT EXISTS idx_survey_photos_building ON survey_photos(building);
        `
      })
      
      if (indexError) {
        console.warn('⚠️  Warning: Could not create index:', indexError)
      } else {
        console.log('✅ Index created successfully')
      }
      
      // Update existing photos with building information
      console.log('🔄 Updating existing photos with building information...')
      const { error: updateError } = await supabase.rpc('exec_sql', {
        sql: `
          UPDATE survey_photos 
          SET building = (
            SELECT w.school 
            FROM survey_submissions ss 
            JOIN walkers w ON ss.walker_id = w.id 
            WHERE ss.id = survey_photos.submission_id
          )
          WHERE building IS NULL;
        `
      })
      
      if (updateError) {
        console.warn('⚠️  Warning: Could not update existing photos:', updateError)
      } else {
        console.log('✅ Existing photos updated successfully')
      }
      
    } else if (testError) {
      console.error('❌ Error checking building column:', testError)
      return
    } else {
      console.log('✅ Building column already exists')
    }
    
    // Check if floor_level column exists
    const { data: floorTestData, error: floorTestError } = await supabase
      .from('survey_photos')
      .select('floor_level')
      .limit(1)
    
    if (floorTestError && floorTestError.code === '42703') {
      console.log('❌ Floor level column does not exist. Adding it now...')
      
      const { error: floorAlterError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE survey_photos 
          ADD COLUMN floor_level TEXT;
        `
      })
      
      if (floorAlterError) {
        console.error('❌ Error adding floor_level column:', floorAlterError)
      } else {
        console.log('✅ Floor level column added successfully')
      }
    } else if (floorTestError) {
      console.error('❌ Error checking floor_level column:', floorTestError)
    } else {
      console.log('✅ Floor level column already exists')
    }
    
    console.log('🎉 Database schema check completed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the check
checkAndAddBuildingColumn() 