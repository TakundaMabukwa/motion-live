require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findVRNCompanies() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('company, new_account_number')
    .ilike('company', '%VRN%')
    .not('company', 'is', null);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Get unique companies
  const unique = [...new Map(data.map(item => [item.company, item])).values()];
  
  console.log('\n🔍 VRN COMPANIES IN DATABASE:\n');
  console.log('='.repeat(80));
  unique.forEach(row => {
    console.log(`${row.company} | ${row.new_account_number || 'NO ACCOUNT'}`);
  });
  console.log('\n' + '='.repeat(80));
  console.log(`\nTotal VRN companies found: ${unique.length}\n`);
}

findVRNCompanies();
