require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function matchRegsToExcel() {
  console.log('🔍 MATCHING REGS IN DB TO EXCEL GROUP COLUMN\n');
  console.log('='.repeat(80));
  
  // Read Excel
  const workbook = XLSX.readFile('scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const headerRowIndex = rawData.findIndex(row => 
    row && row.includes('CLIENT') && row.includes('GROUP')
  );
  
  const headers = rawData[headerRowIndex];
  const dataRows = rawData.slice(headerRowIndex + 1);
  
  const data = dataRows
    .filter(row => row && row.length > 0)
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => { obj[header] = row[i]; });
      return obj;
    })
    .filter(row => row.CLIENT && row.GROUP);
  
  // Get all existing vehicles from DB
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, reg, fleet_number, company, new_account_number');
  
  const vehiclesByReg = new Map();
  vehicles.forEach(v => {
    if (v.reg) vehiclesByReg.set(v.reg.toUpperCase(), v);
  });
  
  console.log(`\n📊 Database: ${vehicles.length} vehicles, ${vehiclesByReg.size} with reg\n`);
  
  // Match Excel regs to DB
  const matches = [];
  const noMatches = [];
  
  data.forEach((row, idx) => {
    const client = row.CLIENT;
    const group = row.GROUP;
    
    // Split regs if they contain dash
    const regs = group.includes('-') && group.match(/[A-Z]{2,}[0-9]+/g) 
      ? group.split('-').map(r => r.trim())
      : [group.trim()];
    
    regs.forEach(reg => {
      const regUpper = reg.toUpperCase();
      const vehicle = vehiclesByReg.get(regUpper);
      
      if (vehicle) {
        matches.push({
          excelRow: idx + headerRowIndex + 2,
          excelClient: client,
          excelReg: reg,
          dbId: vehicle.id,
          dbReg: vehicle.reg,
          dbCompany: vehicle.company,
          dbAccount: vehicle.new_account_number
        });
      } else {
        noMatches.push({
          excelRow: idx + headerRowIndex + 2,
          excelClient: client,
          excelReg: reg
        });
      }
    });
  });
  
  console.log('='.repeat(80));
  console.log('\n📊 MATCH RESULTS:\n');
  console.log(`   ✅ Matched: ${matches.length} regs found in DB`);
  console.log(`   ❌ Not matched: ${noMatches.length} regs NOT in DB (will be inserted)\n`);
  
  // Show sample matches
  console.log('='.repeat(80));
  console.log('\n✅ SAMPLE MATCHES (first 20):\n');
  matches.slice(0, 20).forEach(m => {
    console.log(`Excel Row ${m.excelRow}: ${m.excelReg} (${m.excelClient})`);
    console.log(`   → DB ID ${m.dbId}: ${m.dbReg} | ${m.dbCompany} | ${m.dbAccount || 'NO ACCOUNT'}\n`);
  });
  
  if (matches.length > 20) {
    console.log(`   ... and ${matches.length - 20} more matches\n`);
  }
  
  // Show sample non-matches
  console.log('='.repeat(80));
  console.log('\n❌ SAMPLE NON-MATCHES (first 20):\n');
  noMatches.slice(0, 20).forEach(m => {
    console.log(`Excel Row ${m.excelRow}: ${m.excelReg} → ${m.excelClient} (NEW)`);
  });
  
  if (noMatches.length > 20) {
    console.log(`\n   ... and ${noMatches.length - 20} more non-matches\n`);
  }
  
  console.log('\n='.repeat(80));
  console.log('\n💡 RECOMMENDATION:\n');
  console.log(`   - SKIP ${matches.length} matched regs (already in DB)`);
  console.log(`   - INSERT ${noMatches.length} new regs\n`);
}

matchRegsToExcel();
