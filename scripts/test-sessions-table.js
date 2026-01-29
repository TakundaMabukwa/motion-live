require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('Testing user_sessions table...\n');
  
  const { data, error, count } = await supabase
    .from('user_sessions')
    .select('*', { count: 'exact' });
  
  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Table does not exist. Run the migration SQL first!\n');
    return;
  }
  
  console.log(`✅ Table exists`);
  console.log(`📊 Total records: ${count}`);
  
  if (data && data.length > 0) {
    console.log('\nSample data:');
    console.log(data[0]);
  } else {
    console.log('\n⚠️  Table is empty. Logout and login again to create a session.\n');
  }
}

test();
