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

async function rollbackToJan23() {
  const cutoffDate = new Date('2026-01-24T00:00:00Z'); // Start of Jan 24
  
  console.log(`\n🔍 Checking vehicles created/updated after ${cutoffDate.toLocaleString()}...\n`);
  
  // Get vehicles created after Jan 23
  const { data: newVehicles, error: newError } = await supabase
    .from('vehicles')
    .select('id, created_at, reg, fleet_number, company')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });
  
  if (newError) {
    console.error('❌ Error:', newError);
    return;
  }
  
  console.log(`📊 Found ${newVehicles?.length || 0} vehicles created after Jan 23, 2026\n`);
  
  if (newVehicles && newVehicles.length > 0) {
    console.log('Sample of vehicles to delete:');
    newVehicles.slice(0, 10).forEach((v, i) => {
      console.log(`  ${i + 1}. ID: ${v.id} | Reg: ${v.reg || v.fleet_number} | Created: ${new Date(v.created_at).toLocaleString()}`);
    });
    if (newVehicles.length > 10) {
      console.log(`  ... and ${newVehicles.length - 10} more`);
    }
  }
  
  console.log('\n⚠️  WARNING: This will DELETE all vehicles created after Jan 23, 2026');
  console.log('⚠️  This action CANNOT be undone!\n');
  
  rl.question(`❓ Proceed with deletion of ${newVehicles?.length || 0} vehicles? (type "DELETE" to confirm): `, async (answer) => {
    if (answer === 'DELETE') {
      console.log('\n🗑️  Deleting vehicles...');
      
      const ids = newVehicles.map(v => v.id);
      const { error: deleteError } = await supabase
        .from('vehicles')
        .delete()
        .in('id', ids);
      
      if (deleteError) {
        console.error('❌ Delete failed:', deleteError);
      } else {
        console.log(`✅ Successfully deleted ${newVehicles.length} vehicles`);
        console.log('✅ Database rolled back to Jan 23, 2026');
      }
    } else {
      console.log('❌ Cancelled - no changes made');
    }
    rl.close();
  });
}

rollbackToJan23();
