const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://qvpfvpyrgylfbwmbtobm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cGZ2cHlyZ3lsZmJ3bWJ0b2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODY0MDYsImV4cCI6MjA2ODk2MjQwNn0.aLAJinWwQ8e3DcNjYBBDm0Rx04u0pnm1Ury4pdn37l0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPhotoGallery() {
  console.log('🔍 Testing photo gallery functionality...')
  
  try {
    // Test 1: Check if survey_photos table has data
    console.log('\n1. Checking survey_photos table...')
    const { data: photos, error: photosError } = await supabase
      .from('survey_photos')
      .select('*')
      .limit(5)
    
    if (photosError) {
      console.error('❌ Survey photos table error:', photosError)
    } else {
      console.log('✅ Survey photos table accessible')
      console.log(`📸 Found ${photos?.length || 0} photos in database`)
      
      if (photos && photos.length > 0) {
        console.log('📋 Sample photo data:')
        photos.forEach((photo, index) => {
          console.log(`  Photo ${index + 1}:`)
          console.log(`    ID: ${photo.id}`)
          console.log(`    Submission ID: ${photo.submission_id}`)
          console.log(`    File path: ${photo.file_path}`)
          console.log(`    File name: ${photo.file_name}`)
          console.log(`    Category: ${photo.survey_category}`)
          console.log(`    Uploaded: ${photo.uploaded_at}`)
          console.log(`    Location: ${photo.location_x}, ${photo.location_y}`)
          console.log(`    Floor: ${photo.floor_level}`)
          console.log('')
        })
      }
    }

    // Test 2: Check if survey_submissions table has data
    console.log('\n2. Checking survey_submissions table...')
    const { data: submissions, error: submissionsError } = await supabase
      .from('survey_submissions')
      .select('id, created_at')
      .limit(3)
    
    if (submissionsError) {
      console.error('❌ Survey submissions table error:', submissionsError)
    } else {
      console.log('✅ Survey submissions table accessible')
      console.log(`📝 Found ${submissions?.length || 0} submissions`)
      
      if (submissions && submissions.length > 0) {
        console.log('📋 Sample submission data:')
        submissions.forEach((submission, index) => {
          console.log(`  Submission ${index + 1}:`)
          console.log(`    ID: ${submission.id}`)
          console.log(`    Created: ${submission.created_at}`)
          console.log('')
        })
      }
    }

    // Test 3: Check photos for a specific submission
    if (submissions && submissions.length > 0) {
      const testSubmissionId = submissions[0].id
      console.log(`\n3. Checking photos for submission ${testSubmissionId}...`)
      
      const { data: submissionPhotos, error: submissionPhotosError } = await supabase
        .from('survey_photos')
        .select('*')
        .eq('submission_id', testSubmissionId)
        .order('uploaded_at', { ascending: false })
      
      if (submissionPhotosError) {
        console.error('❌ Error fetching submission photos:', submissionPhotosError)
      } else {
        console.log(`✅ Found ${submissionPhotos?.length || 0} photos for submission ${testSubmissionId}`)
        
        if (submissionPhotos && submissionPhotos.length > 0) {
          console.log('📋 Photos for this submission:')
          submissionPhotos.forEach((photo, index) => {
            console.log(`  Photo ${index + 1}:`)
            console.log(`    ID: ${photo.id}`)
            console.log(`    File path: ${photo.file_path}`)
            console.log(`    Category: ${photo.survey_category}`)
            console.log(`    Has location: ${photo.location_x !== null && photo.location_y !== null}`)
            console.log('')
          })
        }
      }
    }

    // Test 3.5: Check which submissions actually have photos
    console.log('\n3.5. Checking which submissions have photos...')
    const { data: submissionsWithPhotos, error: submissionsWithPhotosError } = await supabase
      .from('survey_photos')
      .select('submission_id')
      .order('uploaded_at', { ascending: false })
    
    if (submissionsWithPhotosError) {
      console.error('❌ Error fetching submissions with photos:', submissionsWithPhotosError)
    } else {
      const uniqueSubmissionIds = [...new Set(submissionsWithPhotos?.map(p => p.submission_id) || [])]
      console.log(`✅ Found ${uniqueSubmissionIds.length} submissions with photos:`)
      uniqueSubmissionIds.forEach((submissionId, index) => {
        console.log(`  ${index + 1}. ${submissionId}`)
      })
      
      // Check if any of these match the submissions from the admin page
      const adminSubmissionIds = submissions?.map(s => s.id) || []
      const matchingSubmissions = uniqueSubmissionIds.filter(id => adminSubmissionIds.includes(id))
      console.log(`\n📊 ${matchingSubmissions.length} out of ${adminSubmissionIds.length} admin submissions have photos`)
      
      if (matchingSubmissions.length === 0) {
        console.log('❌ No photos found for any of the submissions shown in the admin page!')
        console.log('This explains why photos aren\'t showing up.')
      }
    }

    // Test 4: Test the photo URL generation
    if (photos && photos.length > 0) {
      const testPhoto = photos[0]
      console.log(`\n4. Testing photo URL generation for photo ${testPhoto.id}...`)
      
      const photoUrl = `/api/photos/${testPhoto.id}`
      console.log(`📸 Generated URL: ${photoUrl}`)
      console.log(`📁 File path in database: ${testPhoto.file_path}`)
      
      // Test if we can access the photo via the API
      console.log('🌐 Testing API access...')
      try {
        const response = await fetch(`http://localhost:3003${photoUrl}`)
        console.log(`📡 API Response Status: ${response.status}`)
        console.log(`📡 API Response Headers:`, Object.fromEntries(response.headers.entries()))
        
        if (response.status === 307) {
          console.log('✅ API returned redirect (expected for signed URLs)')
        } else if (response.ok) {
          console.log('✅ API returned success')
        } else {
          console.log('❌ API returned error')
        }
      } catch (error) {
        console.error('❌ Error testing API access:', error.message)
      }
    }

  } catch (error) {
    console.error('❌ General error:', error)
  }
}

testPhotoGallery().catch(console.error) 