require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteRecentVehicles() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Get vehicles added in last 24h
  const { data: recentVehicles, error } = await supabase
    .from('vehicles')
    .select('id, created_at, reg, fleet_number, company')
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\n⚠️  Found ${recentVehicles.length} vehicles added in last 24 hours:\n`);
  recentVehicles.forEach((v, i) => {
    console.log(`${i + 1}. ID: ${v.id} | Reg: ${v.reg || v.fleet_number} | Company: ${v.company} | Created: ${new Date(v.created_at).toLocaleString()}`);
  });
  
  rl.question(`\n❓ Delete these ${recentVehicles.length} vehicles? (yes/no): `, async (answer) => {
    if (answer.toLowerCase() === 'yes') {
      const ids = recentVehicles.map(v => v.id);
      const { error: deleteError } = await supabase
        .from('vehicles')
        .delete()
        .in('id', ids);
      
      if (deleteError) {
        console.error('❌ Delete failed:', deleteError);
      } else {
        console.log(`✅ Successfully deleted ${recentVehicles.length} vehicles`);
      }
    } else {
      console.log('❌ Cancelled');
    }
    rl.close();
  });
}

deleteRecentVehicles();
