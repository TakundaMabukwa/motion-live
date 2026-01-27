const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  }
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('========================================');
  console.log('FAITHWHEELS VEHICLE MATCHING & INSERT');
  console.log('========================================\n');

  // Read CSV
  const csvPath = path.join(__dirname, 'vehicles_not_in_db.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvData.split('\n');
  
  // Find FAITHWHEELS vehicles
  const faithwheelsVehicles = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.includes('FAITHWHEELS')) {
      const fields = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current);
      
      const group = fields[3]; // GROUP column (reg)
      faithwheelsVehicles.push({ group, fields });
    }
  }
  
  console.log(`📊 Found ${faithwheelsVehicles.length} FAITHWHEELS vehicles in CSV\n`);
  
  // Fetch all existing regs from DB
  console.log('🔍 Checking which vehicles already exist in DB...\n');
  
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('reg, fleet_number');
  
  const existingRegs = new Set();
  allVehicles?.forEach(v => {
    if (v.reg) existingRegs.add(v.reg.toUpperCase().trim());
    if (v.fleet_number) existingRegs.add(v.fleet_number.toUpperCase().trim());
  });
  
  // Check which ones need to be inserted
  const toInsert = [];
  const alreadyExists = [];
  
  faithwheelsVehicles.forEach(vehicle => {
    const reg = vehicle.group.toUpperCase().trim();
    if (existingRegs.has(reg)) {
      alreadyExists.push(vehicle);
    } else {
      toInsert.push(vehicle);
    }
  });
  
  console.log(`✅ Already in DB: ${alreadyExists.length}`);
  console.log(`➕ To insert: ${toInsert.length}\n`);
  
  if (toInsert.length === 0) {
    console.log('✅ All FAITHWHEELS vehicles already exist in DB!');
    return;
  }
  
  console.log('📝 Inserting new vehicles...\n');
  
  let inserted = 0;
  let errors = 0;
  
  for (const vehicle of toInsert) {
    const reg = vehicle.group.trim();
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .insert({
          reg: reg,
          company: 'SEVEN DAYS TRADING 125 (PTY) LTD',
          new_account_number: 'SEVE-0001'
        });
      
      if (error) {
        console.error(`❌ ${reg}: ${error.message}`);
        errors++;
      } else {
        console.log(`✅ ${reg}`);
        inserted++;
      }
    } catch (err) {
      console.error(`❌ ${reg}: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n========================================');
  console.log('COMPLETE!');
  console.log('========================================');
  console.log(`✅ Successfully inserted: ${inserted}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`Total: ${toInsert.length}`);
  console.log('========================================');
}

main().catch(console.error);
