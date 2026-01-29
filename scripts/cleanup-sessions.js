require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function closeInactiveSessions() {
  try {
    const { data, error } = await supabase.rpc('close_inactive_sessions');
    
    if (error) throw error;
    
    console.log(`✅ Closed ${data} inactive sessions`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

closeInactiveSessions();
