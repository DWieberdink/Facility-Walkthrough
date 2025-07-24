const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Checking database tables...')
console.log('URL:', supabaseUrl)

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  const tables = [
    'walkers',
    'survey_submissions', 
    'survey_responses',
    'classroom_entries',
    'classroom_responses',
    'survey_photos'
  ]

  console.log('\nChecking each table:')
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1)
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${table} - DOES NOT EXIST`)
        } else {
          console.log(`❌ ${table} - ERROR: ${error.message}`)
        }
      } else {
        console.log(`✅ ${table} - EXISTS`)
      }
    } catch (err) {
      console.log(`❌ ${table} - EXCEPTION: ${err.message}`)
    }
  }
  
  console.log('\nSummary:')
  console.log('If you see any "DOES NOT EXIST" messages, you need to run the setup script.')
  console.log('Go to: https://supabase.com/dashboard/project/qvpfvpyrgylfbwmbtobm')
  console.log('Then: SQL Editor → New query → Paste setup-database-tables.sql → Run')
}

checkTables().catch(console.error) 