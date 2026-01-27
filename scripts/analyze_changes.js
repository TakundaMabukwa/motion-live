require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeChanges() {
  const cutoffDate = new Date('2026-01-24T00:00:00Z');
  
  console.log('🔍 ANALYZING DATA CHANGES AFTER JAN 23, 2026\n');
  console.log('='.repeat(80));
  
  // Check new vehicles
  const { data: newVehicles, error: newError } = await supabase
    .from('vehicles')
    .select('*')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });
  
  if (newError) {
    console.error('Error:', newError);
    return;
  }
  
  console.log(`\n📊 NEW VEHICLES ADDED: ${newVehicles?.length || 0}\n`);
  
  if (newVehicles && newVehicles.length > 0) {
    console.log('Details:');
    newVehicles.forEach((v, i) => {
      console.log(`\n${i + 1}. ID: ${v.id}`);
      console.log(`   Reg: ${v.reg || 'N/A'}`);
      console.log(`   Fleet: ${v.fleet_number || 'N/A'}`);
      console.log(`   Company: ${v.company || 'N/A'}`);
      console.log(`   Account: ${v.new_account_number || v.account_number || 'N/A'}`);
      console.log(`   Created: ${new Date(v.created_at).toLocaleString()}`);
      console.log(`   Total Rental Sub: ${v.total_rental_sub || 0}`);
      console.log(`   Total Sub: ${v.total_sub || 0}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 WHAT DO YOU WANT TO DO?\n');
  console.log('1. Delete all these new vehicles');
  console.log('2. Keep them but fix specific fields');
  console.log('3. Export this data first, then delete');
  console.log('\nTell me what you need to fix!');
}

analyzeChanges();
