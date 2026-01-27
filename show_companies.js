require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function showCompanies() {
  const { data, count } = await supabase
    .from('vehicles')
    .select('company, new_account_number', { count: 'exact' });
  
  const companies = {};
  data.forEach(v => {
    if (!companies[v.company]) {
      companies[v.company] = { count: 0, codes: new Set() };
    }
    companies[v.company].count++;
    companies[v.company].codes.add(v.new_account_number);
  });
  
  console.log(`Total vehicles: ${count}\n`);
  console.log('Companies in vehicles table:\n');
  
  Object.entries(companies).forEach(([company, info]) => {
    console.log(`"${company}" | ${info.count} vehicles | codes: [${[...info.codes].join(', ')}]`);
  });
}

showCompanies();
