require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findMismatches() {
  const csv = fs.readFileSync('cost_centers.csv', 'utf-8');
  const lines = csv.split('\n').slice(1);
  
  const csvMap = {};
  lines.forEach(line => {
    if (!line.trim()) return;
    const match = line.match(/^"?([^"]*?)"?,(.+)$/);
    if (match) {
      csvMap[match[1].trim().toLowerCase()] = match[2].trim();
    }
  });
  
  let page = 0;
  const pageSize = 1000;
  let allVehicles = [];
  
  while (true) {
    const { data } = await supabase
      .from('vehicles')
      .select('id, company, new_account_number, fleet_number')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (!data || data.length === 0) break;
    allVehicles = allVehicles.concat(data);
    page++;
  }
  
  console.log(`Checking ${allVehicles.length} vehicles...\n`);
  
  const mismatches = allVehicles.filter(v => {
    const companyKey = v.company?.trim().toLowerCase();
    const expectedCode = csvMap[companyKey];
    return expectedCode && v.new_account_number !== expectedCode;
  });
  
  console.log(`Found ${mismatches.length} mismatches:\n`);
  mismatches.forEach(v => {
    const expectedCode = csvMap[v.company?.trim().toLowerCase()];
    console.log(`${v.fleet_number || v.id} | "${v.company}" | ${v.new_account_number} -> ${expectedCode}`);
  });
}

findMismatches();
