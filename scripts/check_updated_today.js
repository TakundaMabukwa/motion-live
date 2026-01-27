require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUpdatedToday() {
  console.log('🔍 CHECKING VEHICLES TABLE FOR UPDATE TRACKING\n');
  console.log('='.repeat(80));
  
  // First, check if there's an updated_at column
  const { data: sample, error: sampleError } = await supabase
    .from('vehicles')
    .select('*')
    .limit(1);
  
  if (sampleError) {
    console.error('Error:', sampleError);
    return;
  }
  
  const hasUpdatedAt = sample && sample[0] && 'updated_at' in sample[0];
  
  console.log(`\n📋 TABLE INFO:`);
  console.log(`   Has 'updated_at' column: ${hasUpdatedAt ? 'YES' : 'NO'}\n`);
  
  if (!hasUpdatedAt) {
    console.log('⚠️  The vehicles table does NOT have an "updated_at" column.');
    console.log('⚠️  Cannot track which rows were updated vs created.\n');
    console.log('💡 WORKAROUND: Compare created_at dates\n');
    
    const cutoffDate = new Date('2026-01-24T00:00:00Z');
    const today = new Date('2026-01-25T00:00:00Z');
    
    // Get vehicles created before Jan 24 (these existed before)
    const { count: oldVehicles } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString());
    
    // Get vehicles created on/after Jan 24 (new inserts)
    const { count: newVehicles } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', cutoffDate.toISOString());
    
    console.log(`📊 BREAKDOWN:`);
    console.log(`   Vehicles created BEFORE Jan 24: ${oldVehicles} (potentially updated)`);
    console.log(`   Vehicles created AFTER Jan 23: ${newVehicles} (new inserts)\n`);
    
    console.log('⚠️  WITHOUT "updated_at" column, we CANNOT identify which of the');
    console.log('    ${oldVehicles} old vehicles were updated today.\n');
    
  } else {
    const today = new Date('2026-01-25T00:00:00Z');
    
    const { data: updated, error: updateError } = await supabase
      .from('vehicles')
      .select('id, reg, fleet_number, company, created_at, updated_at')
      .gte('updated_at', today.toISOString())
      .lt('created_at', today.toISOString())
      .order('updated_at', { ascending: false });
    
    if (updateError) {
      console.error('Error:', updateError);
      return;
    }
    
    console.log(`\n📊 VEHICLES UPDATED TODAY (created before today):`);
    console.log(`   Total: ${updated?.length || 0}\n`);
    
    if (updated && updated.length > 0) {
      console.log('Sample (first 20):');
      updated.slice(0, 20).forEach((v, i) => {
        console.log(`${i + 1}. ID: ${v.id} | Reg: ${v.reg || v.fleet_number} | Created: ${new Date(v.created_at).toLocaleDateString()} | Updated: ${new Date(v.updated_at).toLocaleString()}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

checkUpdatedToday();
