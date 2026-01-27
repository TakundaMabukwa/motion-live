require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateVehicles() {
  const csv = fs.readFileSync('cost_centers.csv', 'utf-8');
  const lines = csv.split('\n').slice(1);
  
  let updated = 0;
  let errors = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const match = line.match(/^"?([^"]*?)"?,(.+)$/);
    if (!match) continue;
    
    const company = match[1].trim();
    const costCode = match[2].trim();
    
    const { data, error } = await supabase
      .from('vehicles')
      .update({ new_account_number: costCode })
      .eq('company', company);
    
    if (error) {
      console.error(`Error updating ${company}:`, error.message);
      errors++;
    } else {
      console.log(`✓ Updated ${company} -> ${costCode}`);
      updated++;
    }
  }
  
  console.log(`\nDone! Updated: ${updated}, Errors: ${errors}`);
}

updateVehicles();
