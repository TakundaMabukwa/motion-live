require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAccountLinks() {
  const cutoffDate = new Date('2026-01-24T00:00:00Z');
  
  console.log('🔍 CHECKING ACCOUNT LINKS FOR VEHICLES ADDED AFTER JAN 23\n');
  console.log('='.repeat(80));
  
  // Get vehicles added after Jan 23
  const { data: newVehicles, error } = await supabase
    .from('vehicles')
    .select('id, new_account_number, account_number, company, reg')
    .gte('created_at', cutoffDate.toISOString());
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Get unique account numbers
  const accountNumbers = [...new Set(newVehicles.map(v => v.new_account_number || v.account_number).filter(Boolean))];
  
  console.log(`\n📊 STATISTICS:`);
  console.log(`   Total vehicles: ${newVehicles.length}`);
  console.log(`   Unique accounts: ${accountNumbers.length}`);
  console.log(`   Vehicles with no account: ${newVehicles.filter(v => !v.new_account_number && !v.account_number).length}\n`);
  
  // Check if these accounts exist in customers table
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('new_account_number, account_number, company, legal_name')
    .in('new_account_number', accountNumbers);
  
  if (!custError) {
    const customerAccountNumbers = new Set(customers.map(c => c.new_account_number));
    const linkedAccounts = accountNumbers.filter(acc => customerAccountNumbers.has(acc));
    const unlinkedAccounts = accountNumbers.filter(acc => !customerAccountNumbers.has(acc));
    
    console.log(`\n🔗 ACCOUNT LINKS:`);
    console.log(`   Accounts linked to customers table: ${linkedAccounts.length}`);
    console.log(`   Accounts NOT in customers table: ${unlinkedAccounts.length}\n`);
    
    if (unlinkedAccounts.length > 0) {
      console.log(`⚠️  UNLINKED ACCOUNTS (first 20):`);
      unlinkedAccounts.slice(0, 20).forEach(acc => {
        const vehicleCount = newVehicles.filter(v => (v.new_account_number || v.account_number) === acc).length;
        console.log(`   - ${acc} (${vehicleCount} vehicles)`);
      });
    }
  }
  
  // Check vehicles created BEFORE Jan 24
  const { count: oldCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', cutoffDate.toISOString());
  
  console.log(`\n\n📅 COMPARISON:`);
  console.log(`   Vehicles BEFORE Jan 24: ${oldCount}`);
  console.log(`   Vehicles AFTER Jan 23: ${newVehicles.length}`);
  console.log(`   Total in database: ${oldCount + newVehicles.length}\n`);
  
  console.log('='.repeat(80));
  console.log('\n💡 SAFE DELETE OPTIONS:\n');
  console.log('1. Delete ALL 1,925 vehicles (keeps customer links intact)');
  console.log('2. Delete only vehicles with unlinked accounts');
  console.log('3. Keep all and manually fix data\n');
}

checkAccountLinks();
