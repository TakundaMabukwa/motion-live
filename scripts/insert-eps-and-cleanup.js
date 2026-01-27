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
  console.log('E.P.S. INSERT & CSV CLEANUP');
  console.log('========================================\n');

  const csvPath = path.join(__dirname, 'vehicles_not_in_db.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvData.split('\n');
  
  const epsVehicles = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.includes('E.P.S. COURIER SERVICES')) {
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
      
      let reg = fields[3].toUpperCase().trim();
      if (reg.includes(' - ')) {
        const parts = reg.split(' - ');
        reg = parts[parts.length - 1].trim();
      }
      reg = reg.replace(/^(TRAILER INSTALLATION|NEW TRAILER INSTALL|SKYCAM INSTALL|SKYCAM CAMERA INSTALL|RE-INSTALL|ADDITIONAL INSTALL)\s*/i, '').trim();
      
      epsVehicles.push({ reg, lineIndex: i });
    }
  }
  
  console.log(`📊 Found ${epsVehicles.length} E.P.S. vehicles\n`);
  
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('reg, fleet_number');
  
  const existingRegs = new Set();
  allVehicles?.forEach(v => {
    if (v.reg) existingRegs.add(v.reg.toUpperCase().trim());
    if (v.fleet_number) existingRegs.add(v.fleet_number.toUpperCase().trim());
  });
  
  const toInsert = [];
  const alreadyExists = [];
  
  epsVehicles.forEach(vehicle => {
    if (existingRegs.has(vehicle.reg)) {
      alreadyExists.push(vehicle);
    } else {
      toInsert.push(vehicle);
    }
  });
  
  console.log(`✅ Already in DB: ${alreadyExists.length}`);
  console.log(`➕ To insert: ${toInsert.length}\n`);
  
  if (toInsert.length > 0) {
    console.log('📝 Inserting vehicles...\n');
    
    let inserted = 0;
    let errors = 0;
    
    for (const vehicle of toInsert) {
      try {
        const { error } = await supabase
          .from('vehicles')
          .insert({
            reg: vehicle.reg,
            company: 'EPS COURIER SERVICES',
            new_account_number: 'EPSC-0001'
          });
        
        if (error) {
          console.error(`❌ ${vehicle.reg}: ${error.message}`);
          errors++;
        } else {
          console.log(`✅ ${vehicle.reg}`);
          inserted++;
        }
      } catch (err) {
        console.error(`❌ ${vehicle.reg}: ${err.message}`);
        errors++;
      }
    }
    
    console.log(`\n✅ Inserted: ${inserted}`);
    console.log(`❌ Errors: ${errors}\n`);
  }
  
  console.log('🗑️  Removing E.P.S. vehicles from CSV...\n');
  
  const outputLines = [lines[0]];
  let removed = 0;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].includes('E.P.S. COURIER SERVICES')) {
      removed++;
    } else {
      outputLines.push(lines[i]);
    }
  }
  
  fs.writeFileSync(csvPath, outputLines.join('\n'));
  
  console.log(`✅ Removed ${removed} E.P.S. vehicles from CSV`);
  console.log(`📊 Remaining records: ${outputLines.length - 1}\n`);
  
  console.log('========================================');
  console.log('COMPLETE!');
  console.log('========================================');
}

main().catch(console.error);
