const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateFloorPlans() {
  console.log('🚀 Starting floor plan migration to Supabase...')
  
  try {
    // 1. Check if floor-plans bucket exists, create if not
    console.log('📦 Checking floor-plans storage bucket...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('Error checking buckets:', bucketsError)
      return
    }
    
    const floorPlansBucket = buckets.find(bucket => bucket.id === 'floor-plans')
    
    if (!floorPlansBucket) {
      console.log('Creating floor-plans bucket...')
      const { error: createBucketError } = await supabase.storage.createBucket('floor-plans', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 10485760 // 10MB
      })
      
      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError)
        return
      }
      console.log('✅ Floor-plans bucket created successfully')
    } else {
      console.log('✅ Floor-plans bucket already exists')
    }
    
    // 2. Check if floor_plans table exists
    console.log('🗄️ Checking floor_plans table...')
    const { data: tableExists, error: tableError } = await supabase
      .from('floor_plans')
      .select('id')
      .limit(1)
    
    if (tableError && tableError.code === 'PGRST116') {
      console.log('Creating floor_plans table...')
      // Run the SQL setup script
      const setupSQL = fs.readFileSync(path.join(__dirname, 'setup-floorplan-storage.sql'), 'utf8')
      const { error: sqlError } = await supabase.rpc('exec_sql', { sql: setupSQL })
      
      if (sqlError) {
        console.error('Error creating table:', sqlError)
        console.log('Please run the setup-floorplan-storage.sql script manually in your Supabase SQL Editor')
        return
      }
      console.log('✅ Floor_plans table created successfully')
    } else if (tableError) {
      console.error('Error checking table:', tableError)
      return
    } else {
      console.log('✅ Floor_plans table already exists')
    }
    
    // 3. Upload existing floor plan files
    const publicDir = path.join(__dirname, '..', 'public')
    const floorPlanFiles = [
      { name: 'floorplan.jpg', building: 'Main Building', floor: 'first', description: 'First floor plan' },
      { name: 'second-floor-plan.jpg', building: 'Main Building', floor: 'second', description: 'Second floor plan' }
    ]
    
    console.log('📤 Uploading existing floor plan files...')
    
    for (const fileInfo of floorPlanFiles) {
      const filePath = path.join(publicDir, fileInfo.name)
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ File ${fileInfo.name} not found, skipping...`)
        continue
      }
      
      console.log(`Uploading ${fileInfo.name}...`)
      
      // Read file
      const fileBuffer = fs.readFileSync(filePath)
      const fileName = `${fileInfo.building.toLowerCase().replace(/\s+/g, '-')}-${fileInfo.floor}-${Date.now()}.jpg`
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(fileName, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        })
      
      if (uploadError) {
        console.error(`Error uploading ${fileInfo.name}:`, uploadError)
        continue
      }
      
      // Insert metadata into database
      const { error: insertError } = await supabase
        .from('floor_plans')
        .insert({
          building_name: fileInfo.building,
          floor_level: fileInfo.floor,
          file_name: fileInfo.name,
          file_path: `floor-plans/${fileName}`,
          file_size: fileBuffer.length,
          mime_type: 'image/jpeg',
          description: fileInfo.description,
          uploaded_by: 'Migration Script',
          is_active: true,
          version: 1
        })
      
      if (insertError) {
        console.error(`Error inserting metadata for ${fileInfo.name}:`, insertError)
        // Try to delete the uploaded file
        await supabase.storage.from('floor-plans').remove([fileName])
        continue
      }
      
      console.log(`✅ Successfully migrated ${fileInfo.name}`)
    }
    
    // 4. Verify migration
    console.log('🔍 Verifying migration...')
    const { data: floorPlans, error: verifyError } = await supabase
      .from('floor_plans')
      .select('*')
      .eq('is_active', true)
    
    if (verifyError) {
      console.error('Error verifying migration:', verifyError)
      return
    }
    
    console.log(`✅ Migration complete! Found ${floorPlans.length} active floor plans:`)
    floorPlans.forEach(plan => {
      console.log(`  - ${plan.building_name} ${plan.floor_level}: ${plan.file_name}`)
    })
    
    console.log('\n🎉 Floor plan migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Update your components to use the new floor plan URLs')
    console.log('2. Test the floor plan functionality')
    console.log('3. Access the admin interface at /admin/floorplans to manage floor plans')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// Run the migration
migrateFloorPlans() 