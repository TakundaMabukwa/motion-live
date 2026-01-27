require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
);

async function getUniqueEdgeAccounts() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('new_account_number')
    .ilike('new_account_number', '%EDGE%')
    .order('new_account_number');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const unique = [...new Set(data.map(item => item.new_account_number).filter(Boolean))];

  unique.forEach(acc => console.log(acc));
  console.log(`\nTotal: ${unique.length}`);
}

getUniqueEdgeAccounts();
