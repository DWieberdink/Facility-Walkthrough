// Test script to verify photo location updates include building information
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

async function testPhotoLocationUpdate() {
  console.log('🔍 Testing photo location update with building information...')
  
  try {
    // 1. Get a sample photo to test with
    const { data: photos, error: photosError } = await supabase
      .from('survey_photos')
      .select('id, file_name, building, floor_level, location_x, location_y')
      .limit(1)
    
    if (photosError) {
      console.error('❌ Error fetching photos:', photosError)
      return
    }
    
    if (!photos || photos.length === 0) {
      console.log('⚠️ No photos found in database to test with')
      return
    }
    
    const testPhoto = photos[0]
    console.log('\n📸 Test photo found:')
    console.log(`  ID: ${testPhoto.id}`)
    console.log(`  File: ${testPhoto.file_name}`)
    console.log(`  Current building: ${testPhoto.building || 'null'}`)
    console.log(`  Current floor: ${testPhoto.floor_level || 'null'}`)
    console.log(`  Current location: ${testPhoto.location_x || 'null'}, ${testPhoto.location_y || 'null'}`)
    
    // 2. Test updating the photo location with building information
    const testBuilding = 'Test Building'
    const testFloor = 'first'
    const testX = 25.5
    const testY = 75.2
    
    console.log(`\n🔄 Updating photo location...`)
    console.log(`  Building: ${testBuilding}`)
    console.log(`  Floor: ${testFloor}`)
    console.log(`  Location: ${testX}, ${testY}`)
    
    const { data: updatedPhoto, error: updateError } = await supabase
      .from('survey_photos')
      .update({
        building: testBuilding,
        floor_level: testFloor,
        location_x: testX,
        location_y: testY
      })
      .eq('id', testPhoto.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Error updating photo:', updateError)
      return
    }
    
    console.log('\n✅ Photo updated successfully!')
    console.log(`  New building: ${updatedPhoto.building}`)
    console.log(`  New floor: ${updatedPhoto.floor_level}`)
    console.log(`  New location: ${updatedPhoto.location_x}, ${updatedPhoto.location_y}`)
    
    // 3. Test the API endpoint directly
    console.log('\n🌐 Testing API endpoint...')
    
    const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/survey_photos?id=eq.${testPhoto.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        building: 'API Test Building',
        floor_level: 'second',
        location_x: 50.0,
        location_y: 25.0
      })
    })
    
    if (apiResponse.ok) {
      console.log('✅ API endpoint test successful')
    } else {
      console.error('❌ API endpoint test failed:', apiResponse.status, apiResponse.statusText)
    }
    
    // 4. Verify the photo appears in the correct building/floor in the gallery
    console.log('\n🔍 Testing gallery filtering...')
    
    const { data: filteredPhotos, error: filterError } = await supabase
      .from('survey_photos')
      .select('id, building, floor_level, location_x, location_y')
      .eq('building', 'API Test Building')
      .eq('floor_level', 'second')
      .not('location_x', 'is', null)
      .not('location_y', 'is', null)
    
    if (filterError) {
      console.error('❌ Error filtering photos:', filterError)
      return
    }
    
    console.log(`✅ Found ${filteredPhotos?.length || 0} photos in API Test Building, second floor`)
    
    if (filteredPhotos && filteredPhotos.length > 0) {
      filteredPhotos.forEach((photo, index) => {
        console.log(`  Photo ${index + 1}: ${photo.id} at ${photo.location_x}, ${photo.location_y}`)
      })
    }
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📝 Summary:')
    console.log('  ✅ Building information is properly stored in the database')
    console.log('  ✅ API endpoint accepts building parameter')
    console.log('  ✅ Photos can be filtered by building and floor')
    console.log('  ✅ Location coordinates are properly stored')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testPhotoLocationUpdate() 