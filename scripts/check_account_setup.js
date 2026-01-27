require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
);

async function getAllVehicles() {
  let allVehicles = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data } = await supabase
      .from('vehicles')
      .select('company, new_account_number, account_number')
      .range(from, from + pageSize - 1);
    
    if (!data || data.length === 0) break;
    allVehicles = allVehicles.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return allVehicles;
}

async function checkAccountSetup() {
  console.log('Fetching all vehicles...\n');
  const allVehicles = await getAllVehicles();
  
  console.log(`Total vehicles: ${allVehicles.length}\n`);
  
  // Group by new_account_number
  const accountGroups = new Map();
  
  allVehicles.forEach(v => {
    const acc = v.new_account_number || 'NO_ACCOUNT';
    if (!accountGroups.has(acc)) {
      accountGroups.set(acc, { company: v.company, count: 0 });
    }
    accountGroups.get(acc).count++;
  });
  
  console.log(`Total unique account numbers: ${accountGroups.size}\n`);
  
  // Show EDGE accounts
  const edgeAccounts = [...accountGroups.entries()].filter(([acc]) => acc.includes('EDGE'));
  console.log(`EDGE accounts: ${edgeAccounts.length}`);
  console.log('='.repeat(80));
  edgeAccounts.sort().forEach(([acc, data]) => {
    console.log(`${acc} | ${data.company} | ${data.count} vehicles`);
  });
  
  // Show top 30 non-EDGE accounts
  const nonEdge = [...accountGroups.entries()]
    .filter(([acc]) => !acc.includes('EDGE'))
    .sort((a, b) => b[1].count - a[1].count);
  
  console.log(`\n\nTop 30 non-EDGE accounts:`);
  console.log('='.repeat(80));
  nonEdge.slice(0, 30).forEach(([acc, data]) => {
    console.log(`${acc} | ${data.company} | ${data.count} vehicles`);
  });
  
  // Check for vehicles without new_account_number
  const noAccount = allVehicles.filter(v => !v.new_account_number);
  console.log(`\n\nVehicles without new_account_number: ${noAccount.length}`);
}

checkAccountSetup();
