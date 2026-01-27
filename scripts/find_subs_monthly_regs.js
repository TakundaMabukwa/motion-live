require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findSubsMonthlyRegs() {
  console.log('🔍 SEARCHING FOR VEHICLES WITH "SUBS", "MONTHLY", ETC. IN REG\n');
  console.log('='.repeat(80));
  
  const keywords = ['subs', 'monthly', 'beame', 'roaming', 'installation'];
  const results = {};
  
  for (const keyword of keywords) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, reg, fleet_number, company, new_account_number, created_at, total_rental_sub, total_sub')
      .ilike('reg', `%${keyword}%`)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      results[keyword] = data;
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY:\n');
  for (const [keyword, vehicles] of Object.entries(results)) {
    console.log(`   "${keyword.toUpperCase()}": ${vehicles.length} vehicles`);
  }
  
  // Detailed results
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 DETAILED RESULTS:\n');
  
  for (const [keyword, vehicles] of Object.entries(results)) {
    if (vehicles.length > 0) {
      console.log(`\n🔹 KEYWORD: "${keyword.toUpperCase()}" (${vehicles.length} vehicles)\n`);
      
      vehicles.slice(0, 20).forEach((v, i) => {
        console.log(`${i + 1}. ID: ${v.id}`);
        console.log(`   Reg: ${v.reg}`);
        console.log(`   Fleet: ${v.fleet_number || 'N/A'}`);
        console.log(`   Company: ${v.company || 'N/A'}`);
        console.log(`   Account: ${v.new_account_number || 'N/A'}`);
        console.log(`   Created: ${new Date(v.created_at).toLocaleString()}`);
        console.log(`   Total Sub: ${v.total_sub || 0}`);
        console.log('');
      });
      
      if (vehicles.length > 20) {
        console.log(`   ... and ${vehicles.length - 20} more\n`);
      }
    }
  }
  
  // Check if these are from the bad import
  const cutoffDate = new Date('2026-01-24T00:00:00Z');
  const allBadRegs = Object.values(results).flat();
  const badRegsFromImport = allBadRegs.filter(v => new Date(v.created_at) >= cutoffDate);
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n⚠️  VEHICLES WITH BAD REGS FROM JAN 24+ IMPORT: ${badRegsFromImport.length}\n`);
  
  if (badRegsFromImport.length > 0) {
    console.log('These should be DELETED as they are placeholder/invalid registrations.\n');
  }
}

findSubsMonthlyRegs();
