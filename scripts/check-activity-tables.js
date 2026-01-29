require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('Checking if tables exist...\n');
  
  // Check user_sessions table
  const { data: sessions, error: sessionsError } = await supabase
    .from('user_sessions')
    .select('*')
    .limit(1);
  
  if (sessionsError) {
    console.error('❌ user_sessions table error:', sessionsError.message);
    console.log('\n⚠️  Run the migration first:');
    console.log('   Copy supabase/migrations/20260116_user_activity_tracking.sql');
    console.log('   and run it in your Supabase SQL editor\n');
    return;
  }
  
  console.log('✅ user_sessions table exists');
  console.log(`   Records: ${sessions?.length || 0}\n`);
  
  // Check user_activity_logs table
  const { data: logs, error: logsError } = await supabase
    .from('user_activity_logs')
    .select('*')
    .limit(1);
  
  if (logsError) {
    console.error('❌ user_activity_logs table error:', logsError.message);
    return;
  }
  
  console.log('✅ user_activity_logs table exists');
  console.log(`   Records: ${logs?.length || 0}\n`);
  
  if (sessions?.length === 0) {
    console.log('ℹ️  No sessions yet. Login to create your first session.\n');
  }
}

checkTables();
