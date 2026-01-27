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
  console.log('E.P.S. COURIER SERVICES MATCHING');
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
      
      const group = fields[3];
      epsVehicles.push({ group, fields });
    }
  }
  
  console.log(`📊 Found ${epsVehicles.length} E.P.S. COURIER SERVICES vehicles in CSV\n`);
  
  console.log('🔍 Checking which vehicles already exist in DB...\n');
  
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
    let reg = vehicle.group.toUpperCase().trim();
    
    // Extract registration from patterns like "TRAILER INSTALLATION - KK81HWGP"
    if (reg.includes(' - ')) {
      const parts = reg.split(' - ');
      reg = parts[parts.length - 1].trim(); // Get last part after last dash
    }
    
    // Remove common prefixes if still present
    reg = reg.replace(/^(TRAILER INSTALLATION|NEW TRAILER INSTALL|SKYCAM INSTALL|SKYCAM CAMERA INSTALL|RE-INSTALL|ADDITIONAL INSTALL)\s*/i, '').trim();
    
    if (existingRegs.has(reg)) {
      alreadyExists.push({ ...vehicle, cleanReg: reg });
    } else {
      toInsert.push({ ...vehicle, cleanReg: reg });
    }
  });
  
  console.log(`✅ Already in DB: ${alreadyExists.length}`);
  console.log(`➕ To insert: ${toInsert.length}\n`);
  
  if (toInsert.length > 0) {
    console.log('========================================');
    console.log('TO BE INSERTED (NEW):');
    console.log('========================================\n');
    toInsert.slice(0, 50).forEach(v => {
      console.log(`  ➕ ${v.group} → ${v.cleanReg}`);
    });
    if (toInsert.length > 50) {
      console.log(`  ... and ${toInsert.length - 50} more`);
    }
  }
  
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total E.P.S. vehicles: ${epsVehicles.length}`);
  console.log(`Already in DB: ${alreadyExists.length}`);
  console.log(`To insert: ${toInsert.length}`);
  console.log('========================================');
}

main().catch(console.error);
