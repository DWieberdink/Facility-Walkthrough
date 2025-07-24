const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing database connection...')
console.log('URL:', supabaseUrl)
console.log('Key exists:', !!supabaseKey)

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('\n1. Testing basic connection...')
    
    // Test if we can connect to Supabase
    const { data, error } = await supabase.from('walkers').select('count').limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      
      if (error.message.includes('relation "walkers" does not exist')) {
        console.log('\n💡 The walkers table does not exist. You need to run the setup script.')
        console.log('Go to your Supabase dashboard → SQL Editor → New query')
        console.log('Copy and paste the contents of scripts/setup-database-tables.sql')
        console.log('Then click "Run"')
      }
      
      return false
    }
    
    console.log('✅ Connection successful!')
    
    // Test inserting a walker
    console.log('\n2. Testing walker insertion...')
    const { data: insertData, error: insertError } = await supabase
      .from('walkers')
      .insert({
        name: 'Test User',
        email: 'test@example.com',
        school: 'Test School'
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError.message)
      return false
    }
    
    console.log('✅ Walker insertion successful:', insertData)
    
    // Clean up test data
    console.log('\n3. Cleaning up test data...')
    const { error: deleteError } = await supabase
      .from('walkers')
      .delete()
      .eq('email', 'test@example.com')
    
    if (deleteError) {
      console.warn('⚠️ Cleanup failed:', deleteError.message)
    } else {
      console.log('✅ Test data cleaned up')
    }
    
    console.log('\n🎉 Database connection test passed!')
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1)
}) 