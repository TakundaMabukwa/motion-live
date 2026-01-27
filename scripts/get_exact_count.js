require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getExactCount() {
  const cutoffDate = new Date('2026-01-24T00:00:00Z');
  
  const { count, error } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cutoffDate.toISOString());
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\n📊 EXACT COUNT: ${count} vehicles added after Jan 23, 2026\n`);
}

getExactCount();
