require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
);

async function getEdgeAccounts() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('company, new_account_number')
    .ilike('new_account_number', '%EDGE%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const unique = [...new Map(data.map(item => [item.new_account_number, item])).values()];

  console.log('Account Name | Account Number');
  console.log('='.repeat(80));
  unique.forEach(row => {
    console.log(`${row.company} | ${row.new_account_number}`);
  });
  console.log(`\nTotal accounts found: ${unique.length}`);
}

getEdgeAccounts();
