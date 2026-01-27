require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRestoreOptions() {
  console.log('='.repeat(80));
  console.log('SUPABASE DATA RESTORE OPTIONS');
  console.log('='.repeat(80));
  console.log('\nYour Supabase project URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  console.log('\n📋 RESTORE OPTIONS:\n');
  
  console.log('1. POINT-IN-TIME RECOVERY (PITR)');
  console.log('   - Available on Pro plan and above');
  console.log('   - Go to: Supabase Dashboard > Database > Backups');
  console.log('   - Can restore to any point in the last 7-30 days');
  console.log('   - URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/database/backups\n');
  
  console.log('2. DAILY BACKUPS');
  console.log('   - Available on all plans');
  console.log('   - Go to: Supabase Dashboard > Database > Backups');
  console.log('   - Download yesterday\'s backup and restore\n');
  
  console.log('3. MANUAL SQL RESTORE (if you have a backup)');
  console.log('   - If you exported data before, you can re-import it\n');
  
  console.log('4. CHECK AUDIT LOGS');
  console.log('   - See what changes were made recently');
  console.log('   - May help identify what needs to be reverted\n');
  
  console.log('='.repeat(80));
  console.log('\n⚠️  IMMEDIATE ACTIONS:\n');
  console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Navigate to: Database > Backups');
  console.log('4. Look for yesterday\'s backup or use PITR');
  console.log('\n='.repeat(80));
  
  // Check current vehicle count
  const { count, error } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true });
  
  if (!error) {
    console.log(`\n📊 Current vehicles count: ${count}`);
  }
  
  // Check recent changes (last 24 hours)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data: recentVehicles, error: recentError } = await supabase
    .from('vehicles')
    .select('id, created_at, reg, fleet_number')
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!recentError && recentVehicles?.length > 0) {
    console.log(`\n📅 Recent vehicles added (last 24h): ${recentVehicles.length}`);
    console.log('\nSample of recent entries:');
    recentVehicles.slice(0, 5).forEach(v => {
      console.log(`  - ID: ${v.id}, Reg: ${v.reg || v.fleet_number}, Created: ${new Date(v.created_at).toLocaleString()}`);
    });
  }
}

checkRestoreOptions();
