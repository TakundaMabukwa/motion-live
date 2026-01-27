require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteVehiclesAfterJan23() {
  const cutoffDate = new Date('2026-01-24T00:00:00Z');
  
  console.log('🗑️  DELETING VEHICLES CREATED AFTER JAN 23, 2026\n');
  console.log('='.repeat(80));
  
  // Get count first
  const { count, error: countError } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cutoffDate.toISOString());
  
  if (countError) {
    console.error('❌ Error counting vehicles:', countError);
    return;
  }
  
  console.log(`\n📊 Found ${count} vehicles to delete\n`);
  console.log('⏳ Deleting in batches...\n');
  
  let deletedCount = 0;
  let batchNum = 1;
  
  while (true) {
    // Get IDs in batches
    const { data: vehicles, error: fetchError } = await supabase
      .from('vehicles')
      .select('id')
      .gte('created_at', cutoffDate.toISOString())
      .limit(1000);
    
    if (fetchError) {
      console.error('❌ Error fetching vehicles:', fetchError);
      break;
    }
    
    if (!vehicles || vehicles.length === 0) {
      break;
    }
    
    const ids = vehicles.map(v => v.id);
    
    // Delete batch
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .in('id', ids);
    
    if (deleteError) {
      console.error(`❌ Error deleting batch ${batchNum}:`, deleteError);
      break;
    }
    
    deletedCount += ids.length;
    console.log(`✅ Batch ${batchNum}: Deleted ${ids.length} vehicles (Total: ${deletedCount}/${count})`);
    batchNum++;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ DELETION COMPLETE: ${deletedCount} vehicles deleted\n`);
  
  // Verify
  const { count: remainingCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cutoffDate.toISOString());
  
  console.log(`📊 Remaining vehicles after Jan 23: ${remainingCount || 0}`);
  
  const { count: totalCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Total vehicles in database: ${totalCount}\n`);
}

deleteVehiclesAfterJan23();
