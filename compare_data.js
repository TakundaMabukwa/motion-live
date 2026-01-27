require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function compareData() {
  const csv = fs.readFileSync('cost_centers.csv', 'utf-8');
  const lines = csv.split('\n').slice(1);
  
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('company, new_account_number');
  
  console.log(`Found ${vehicles.length} vehicles in database\n`);
  console.log('CSV Companies vs Vehicles Table:\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const match = line.match(/^"?([^"]*?)"?,(.+)$/);
    if (!match) continue;
    
    const csvCompany = match[1].trim();
    const csvCode = match[2].trim();
    
    const matchingVehicles = vehicles.filter(v => v.company?.trim().toLowerCase() === csvCompany.toLowerCase());
    
    if (matchingVehicles.length === 0) {
      console.log(`❌ "${csvCompany}" -> ${csvCode} | NOT IN VEHICLES TABLE`);
    } else {
      const codes = [...new Set(matchingVehicles.map(v => v.new_account_number))];
      const allMatch = codes.length === 1 && codes[0] === csvCode;
      
      if (allMatch) {
        console.log(`✓ "${csvCompany}" -> ${csvCode} | MATCHES (${matchingVehicles.length} vehicles)`);
      } else {
        console.log(`⚠ "${csvCompany}" -> ${csvCode} | MISMATCH: vehicles have [${codes.join(', ')}] (${matchingVehicles.length} vehicles)`);
      }
    }
  }
}

compareData();
