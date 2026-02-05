require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteToday() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('vehicles')
    .delete()
    .gte('created_at', `${today}T00:00:00`)
    .select();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`✅ Deleted ${data.length} vehicles created today`);
  }
}

deleteToday();
