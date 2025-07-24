const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing photo gallery functionality...')
console.log('URL:', supabaseUrl)

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPhotoGallery() {
  try {
    console.log('\n1. Checking survey_submissions table...')
    const { data: submissions, error: submissionsError } = await supabase
      .from("survey_submissions")
      .select(`
        id,
        created_at,
        walkers (
          name,
          email,
          school
        )
      `)
      .order("created_at", { ascending: false })

    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError.message)
      return
    }

    console.log(`✅ Found ${submissions?.length || 0} survey submissions`)
    
    if (submissions && submissions.length > 0) {
      console.log('Sample submission:', {
        id: submissions[0].id,
        created_at: submissions[0].created_at,
        walker: submissions[0].walkers
      })
    }

    console.log('\n2. Checking survey_photos table...')
    const { data: photos, error: photosError } = await supabase
      .from("survey_photos")
      .select("*")
      .order("uploaded_at", { ascending: false })

    if (photosError) {
      console.error('❌ Error fetching photos:', photosError.message)
      return
    }

    console.log(`✅ Found ${photos?.length || 0} photos`)
    
    if (photos && photos.length > 0) {
      console.log('Sample photo:', {
        id: photos[0].id,
        submission_id: photos[0].submission_id,
        file_name: photos[0].file_name,
        survey_category: photos[0].survey_category,
        uploaded_at: photos[0].uploaded_at
      })
    }

    console.log('\n3. Testing photo-submission relationship...')
    if (submissions && submissions.length > 0 && photos && photos.length > 0) {
      const submissionId = submissions[0].id
      const { data: submissionPhotos, error: relError } = await supabase
        .from("survey_photos")
        .select("*")
        .eq("submission_id", submissionId)

      if (relError) {
        console.error('❌ Error fetching submission photos:', relError.message)
      } else {
        console.log(`✅ Found ${submissionPhotos?.length || 0} photos for submission ${submissionId}`)
      }
    }

    console.log('\n4. Checking storage bucket...')
    const { data: bucketData, error: bucketError } = await supabase.storage
      .from('survey-photos')
      .list()

    if (bucketError) {
      console.error('❌ Error checking storage bucket:', bucketError.message)
    } else {
      console.log(`✅ Storage bucket contains ${bucketData?.length || 0} files`)
      if (bucketData && bucketData.length > 0) {
        console.log('Sample file:', bucketData[0])
      }
    }

    console.log('\n🎉 Photo gallery test completed!')
    
    if (photos && photos.length > 0) {
      console.log('\n📸 Photos are available in the database!')
      console.log('The photo gallery should now display them correctly.')
    } else {
      console.log('\n📸 No photos found in the database.')
      console.log('Upload some photos from the survey to see them in the gallery.')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testPhotoGallery().catch(console.error) 