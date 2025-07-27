const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addBuildingColumn() {
  console.log('🏗️  Adding building column to survey_photos table...')
  
  try {
    // Add building column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE survey_photos 
        ADD COLUMN IF NOT EXISTS building TEXT;
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
    
    // Update existing photos
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
    
    console.log('🎉 Building column migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// Run the migration
addBuildingColumn() 