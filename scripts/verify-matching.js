const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
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

async function verify() {
  // Read Excel
  const excelPath = path.join(__dirname, '20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Get a few sample vehicles from Excel
  const samples = [
    data[9],  // JV59VBGP
    data[11], // FH46GCGP
    data[12], // 910LESGP
    data[13], // ACEAUTOGP
  ];
  
  console.log('SAMPLE VEHICLES FROM EXCEL:\n');
  samples.forEach((row, i) => {
    console.log(`Sample ${i + 1}:`);
    console.log(`  GROUP (col 3): ${row[3]}`);
    console.log(`  NEW REG (col 4): ${row[4]}`);
    console.log('');
  });
  
  // Check in DB
  console.log('CHECKING IN DATABASE:\n');
  
  for (const row of samples) {
    const group = row[3] ? row[3].toString().toUpperCase().trim() : '';
    const newReg = row[4] ? row[4].toString().toUpperCase().trim() : '';
    
    console.log(`Looking for: GROUP="${group}" or NEW_REG="${newReg}"`);
    
    // Check by reg
    const { data: byReg } = await supabase
      .from('vehicles')
      .select('reg, fleet_number, new_account_number')
      .or(`reg.ilike.%${group}%,reg.ilike.%${newReg}%`)
      .limit(5);
    
    // Check by fleet
    const { data: byFleet } = await supabase
      .from('vehicles')
      .select('reg, fleet_number, new_account_number')
      .or(`fleet_number.ilike.%${group}%,fleet_number.ilike.%${newReg}%`)
      .limit(5);
    
    console.log(`  Found by reg: ${byReg?.length || 0}`);
    if (byReg && byReg.length > 0) {
      byReg.forEach(v => console.log(`    - ${v.reg} / ${v.fleet_number}`));
    }
    
    console.log(`  Found by fleet: ${byFleet?.length || 0}`);
    if (byFleet && byFleet.length > 0) {
      byFleet.forEach(v => console.log(`    - ${v.reg} / ${v.fleet_number}`));
    }
    console.log('');
  }
}

verify().catch(console.error);
