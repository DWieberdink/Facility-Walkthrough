// Check what building values are stored in photos
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPhotoBuildings() {
  console.log('🔍 Checking photo building values...')
  
  try {
    // Get all photos with building information
    const { data: photos, error } = await supabase
      .from('survey_photos')
      .select('id, file_name, building, floor_level, location_x, location_y, submission_id')
      .order('uploaded_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching photos:', error)
      return
    }
    
    if (!photos || photos.length === 0) {
      console.log('⚠️ No photos found in database')
      return
    }
    
    console.log(`\n📸 Found ${photos.length} photos:`)
    
    // Group by building
    const buildingGroups = {}
    photos.forEach(photo => {
      const building = photo.building || 'null'
      if (!buildingGroups[building]) {
        buildingGroups[building] = []
      }
      buildingGroups[building].push(photo)
    })
    
    console.log('\n🏢 Photos grouped by building:')
    Object.entries(buildingGroups).forEach(([building, photos]) => {
      console.log(`\n  "${building}" (${photos.length} photos):`)
      photos.forEach(photo => {
        console.log(`    - ${photo.file_name}: floor="${photo.floor_level}", location=(${photo.location_x}, ${photo.location_y})`)
      })
    })
    
    // Check for photos with location but no building
    const photosWithLocationNoBuilding = photos.filter(p => 
      p.location_x !== null && p.location_y !== null && (!p.building || p.building === '')
    )
    
    if (photosWithLocationNoBuilding.length > 0) {
      console.log(`\n⚠️ Found ${photosWithLocationNoBuilding.length} photos with location but no building:`)
      photosWithLocationNoBuilding.forEach(photo => {
        console.log(`  - ${photo.file_name}: building="${photo.building}", floor="${photo.floor_level}"`)
      })
    }
    
    // Check for photos with building but no location
    const photosWithBuildingNoLocation = photos.filter(p => 
      p.building && p.building !== '' && (p.location_x === null || p.location_y === null)
    )
    
    if (photosWithBuildingNoLocation.length > 0) {
      console.log(`\n⚠️ Found ${photosWithBuildingNoLocation.length} photos with building but no location:`)
      photosWithBuildingNoLocation.forEach(photo => {
        console.log(`  - ${photo.file_name}: building="${photo.building}", floor="${photo.floor_level}"`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkPhotoBuildings() 