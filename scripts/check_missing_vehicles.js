require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
);

function parseCSVLine(line) {
  const regex = /"([^"]*)"/g;
  const matches = [];
  let match;
  while ((match = regex.exec(line)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function normalize(str) {
  return str.toUpperCase().replace(/[\s-]/g, '');
}

async function checkVehicles() {
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('fleet_number, reg');

  const existingVehicles = new Set();
  
  allVehicles.forEach(item => {
    if (item.fleet_number) {
      existingVehicles.add(normalize(item.fleet_number));
    }
    if (item.reg) {
      existingVehicles.add(normalize(item.reg));
    }
  });

  console.log(`Total vehicles in DB: ${allVehicles.length}`);
  console.log(`Unique identifiers in DB: ${existingVehicles.size}\n`);

  const csv = fs.readFileSync('./scripts/vehicles_not_in_db.csv', 'utf-8');
  const lines = csv.split('\n');
  
  let totalCSV = 0;
  let notInDB = 0;
  const missing = [];
  
  lines.forEach((line, idx) => {
    if (idx === 0) return; // Skip header
    if (!line.trim()) return;
    
    const fields = parseCSVLine(line);
    if (fields.length < 4) return;
    
    const company = fields[0]?.trim();
    const groupColumn = fields[3]?.trim();
    
    if (!groupColumn) return;
    
    totalCSV++;
    
    const normalizedGroup = normalize(groupColumn);
    
    // Also check individual parts if hyphenated
    const parts = groupColumn.split('-');
    let found = false;
    
    if (existingVehicles.has(normalizedGroup)) {
      found = true;
    } else {
      // Check each part
      for (const part of parts) {
        if (part.trim() && existingVehicles.has(normalize(part))) {
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      notInDB++;
      if (missing.length < 20) {
        missing.push({ company, identifier: groupColumn });
      }
    }
  });

  console.log(`Total vehicles in CSV: ${totalCSV}`);
  console.log(`Vehicles NOT in DB: ${notInDB}`);
  console.log(`Vehicles already in DB: ${totalCSV - notInDB}\n`);
  
  console.log('First 20 missing vehicles:');
  console.log('='.repeat(80));
  missing.forEach(m => {
    console.log(`${m.company} | ${m.identifier}`);
  });
}

checkVehicles();
