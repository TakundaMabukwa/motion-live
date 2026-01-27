require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUpdates() {
  const csv = fs.readFileSync('cost_centers.csv', 'utf-8');
  const lines = csv.split('\n').slice(1);
  
  console.log('Checking which vehicles will be updated...\n');
  
  let willUpdate = 0;
  let noMatch = 0;
  let alreadyCorrect = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const match = line.match(/^"?([^"]*?)"?,(.+)$/);
    if (!match) continue;
    
    const company = match[1].trim();
    const costCode = match[2].trim();
    
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, fleet_number, reg, new_account_number')
      .eq('company', company);
    
    if (error) {
      console.error(`Error checking ${company}:`, error.message);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log(`❌ No match: ${company}`);
      noMatch++;
    } else {
      const needsUpdate = data.filter(v => v.new_account_number !== costCode);
      if (needsUpdate.length > 0) {
        console.log(`✓ Will update ${needsUpdate.length} vehicle(s) for ${company}: ${data[0].new_account_number || 'NULL'} -> ${costCode}`);
        willUpdate += needsUpdate.length;
      } else {
        console.log(`✓ Already correct: ${company} (${data.length} vehicle(s))`);
        alreadyCorrect += data.length;
      }
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Will update: ${willUpdate} vehicles`);
  console.log(`Already correct: ${alreadyCorrect} vehicles`);
  console.log(`No match found: ${noMatch} companies`);
}

checkUpdates();
