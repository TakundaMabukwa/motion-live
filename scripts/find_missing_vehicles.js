require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
);

function normalize(str) {
  return str.toUpperCase().replace(/[\s-]/g, '');
}

async function findMissingVehicles() {
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('fleet_number, reg');

  const existingVehicles = new Set();
  
  allVehicles.forEach(item => {
    if (item.fleet_number) existingVehicles.add(normalize(item.fleet_number));
    if (item.reg) existingVehicles.add(normalize(item.reg));
  });

  const workbook = XLSX.readFile('./scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const missing = [];

  data.forEach((row, index) => {
    if (index < 9) return;
    
    const company = row[0]?.toString().trim();
    const accountNumber = row[1]?.toString().trim();
    const group = row[3]?.toString().trim();
    const newReg = row[4]?.toString().trim();
    const excelPrice = parseFloat(row[row.length - 1]) || 0;
    
    if (!group && !newReg) return;
    
    let found = false;
    
    if (group) {
      const normalizedGroup = normalize(group);
      if (existingVehicles.has(normalizedGroup)) {
        found = true;
      } else if (group.includes('-')) {
        const parts = group.split('-');
        for (const part of parts) {
          if (part.trim() && existingVehicles.has(normalize(part))) {
            found = true;
            break;
          }
        }
      }
    }
    
    if (!found && newReg) {
      const normalizedReg = normalize(newReg);
      if (existingVehicles.has(normalizedReg)) {
        found = true;
      } else if (newReg.includes('-')) {
        const parts = newReg.split('-');
        for (const part of parts) {
          if (part.trim() && existingVehicles.has(normalize(part))) {
            found = true;
            break;
          }
        }
      }
    }
    
    if (!found) {
      missing.push({
        company,
        accountNumber,
        group,
        newReg,
        price: excelPrice
      });
    }
  });

  console.log(`Total vehicles NOT in database: ${missing.length}\n`);
  
  const byCompany = new Map();
  missing.forEach(v => {
    if (!byCompany.has(v.company)) {
      byCompany.set(v.company, []);
    }
    byCompany.get(v.company).push(v);
  });
  
  console.log('Summary by Company (top 20):');
  console.log('='.repeat(80));
  const sorted = [...byCompany.entries()].sort((a, b) => b[1].length - a[1].length);
  sorted.slice(0, 20).forEach(([company, vehicles]) => {
    console.log(`${company} | ${vehicles.length} vehicles`);
  });
  
  console.log('\n\nFirst 30 missing vehicles:');
  console.log('='.repeat(80));
  missing.slice(0, 30).forEach(v => {
    console.log(`${v.company} | ${v.accountNumber} | ${v.group || v.newReg} | R${v.price}`);
  });
}

findMissingVehicles();
