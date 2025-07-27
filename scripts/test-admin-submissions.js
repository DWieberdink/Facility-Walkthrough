const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://qvpfvpyrgylfbwmbtobm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cGZ2cHlyZ3lsZmJ3bWJ0b2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODY0MDYsImV4cCI6MjA2ODk2MjQwNn0.aLAJinWwQ8e3DcNjYBBDm0Rx04u0pnm1Ury4pdn37l0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAdminSubmissions() {
  console.log('🔍 Testing admin submissions function...')
  
  try {
    // Test the getSurveySubmissionsWithPhotos logic
    console.log('\n1. Getting submission IDs that have photos...')
    const { data: photoSubmissions, error: photoError } = await supabase
      .from('survey_photos')
      .select('submission_id')
      .order('uploaded_at', { ascending: false })

    if (photoError) {
      console.error('❌ Error fetching submissions with photos:', photoError)
      return
    }

    const submissionIds = [...new Set(photoSubmissions?.map((p) => p.submission_id) || [])]
    console.log(`✅ Found ${submissionIds.length} unique submissions with photos:`)
    submissionIds.forEach((id, index) => {
      console.log(`  ${index + 1}. ${id}`)
    })

    if (submissionIds.length === 0) {
      console.log('❌ No submissions with photos found!')
      return
    }

    // Get the first few submission IDs for testing
    const testSubmissionIds = submissionIds.slice(0, 3)
    console.log(`\n2. Testing with first ${testSubmissionIds.length} submission IDs...`)

    const { data: submissions, error: submissionsError } = await supabase
      .from('survey_submissions')
      .select(`
        *,
        walkers (
          name,
          email,
          school
        ),
        survey_responses (
          *
        ),
        classroom_entries (
          *,
          classroom_responses (
            *
          )
        )
      `)
      .in('id', testSubmissionIds)
      .order('created_at', { ascending: false })

    if (submissionsError) {
      console.error('❌ Error fetching submissions:', submissionsError)
      return
    }

    console.log(`✅ Successfully fetched ${submissions?.length || 0} submissions:`)
    
    if (submissions && submissions.length > 0) {
      submissions.forEach((submission, index) => {
        console.log(`\n📋 Submission ${index + 1}:`)
        console.log(`  ID: ${submission.id}`)
        console.log(`  Created: ${submission.created_at}`)
        console.log(`  Walker: ${submission.walkers?.name || 'Unknown'}`)
        console.log(`  School: ${submission.walkers?.school || 'Unknown'}`)
        
        // Check how many photos this submission has
        const submissionPhotos = photoSubmissions?.filter(p => p.submission_id === submission.id) || []
        console.log(`  Photos: ${submissionPhotos.length}`)
      })
    }

    // Test photo loading for the first submission
    if (submissions && submissions.length > 0) {
      const firstSubmission = submissions[0]
      console.log(`\n3. Testing photo loading for submission ${firstSubmission.id}...`)
      
      const { data: photos, error: photosError } = await supabase
        .from('survey_photos')
        .select('*')
        .eq('submission_id', firstSubmission.id)
        .order('uploaded_at', { ascending: false })

      if (photosError) {
        console.error('❌ Error fetching photos:', photosError)
      } else {
        console.log(`✅ Found ${photos?.length || 0} photos for this submission:`)
        
        if (photos && photos.length > 0) {
          photos.forEach((photo, index) => {
            console.log(`  Photo ${index + 1}:`)
            console.log(`    ID: ${photo.id}`)
            console.log(`    File path: ${photo.file_path}`)
            console.log(`    Category: ${photo.survey_category}`)
            console.log(`    Has location: ${photo.location_x !== null && photo.location_y !== null}`)
            console.log(`    Floor: ${photo.floor_level}`)
          })
        }
      }
    }

  } catch (error) {
    console.error('❌ General error:', error)
  }
}

testAdminSubmissions().catch(console.error) 