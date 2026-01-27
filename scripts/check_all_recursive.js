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

async function getAllVehicles() {
  let allVehicles = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('fleet_number, reg, total_sub')
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('Error:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allVehicles = allVehicles.concat(data);
    console.log(`Fetched ${allVehicles.length} vehicles...`);
    
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return allVehicles;
}

async function checkAllVehicles() {
  console.log('Fetching all vehicles from database...\n');
  const allVehicles = await getAllVehicles();
  
  console.log(`\nTotal vehicles in DB: ${allVehicles.length}\n`);

  const dbVehicles = new Set();
  
  allVehicles.forEach(item => {
    if (item.fleet_number) dbVehicles.add(normalize(item.fleet_number));
    if (item.reg) dbVehicles.add(normalize(item.reg));
  });

  console.log(`Unique identifiers in DB: ${dbVehicles.size}\n`);

  const workbook = XLSX.readFile('./scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let totalExcel = 0;
  let foundInDB = 0;
  let notFound = 0;

  data.forEach((row, index) => {
    if (index < 9) return;
    
    const group = row[3]?.toString().trim();
    const newReg = row[4]?.toString().trim();
    
    if (!group && !newReg) return;
    
    totalExcel++;
    
    let found = false;
    
    if (group) {
      if (dbVehicles.has(normalize(group))) {
        found = true;
      } else if (group.includes('-')) {
        const parts = group.split('-');
        for (const part of parts) {
          if (part.trim() && dbVehicles.has(normalize(part))) {
            found = true;
            break;
          }
        }
      }
    }
    
    if (!found && newReg) {
      if (dbVehicles.has(normalize(newReg))) {
        found = true;
      } else if (newReg.includes('-')) {
        const parts = newReg.split('-');
        for (const part of parts) {
          if (part.trim() && dbVehicles.has(normalize(part))) {
            found = true;
            break;
          }
        }
      }
    }
    
    if (found) {
      foundInDB++;
    } else {
      notFound++;
    }
  });

  console.log('FINAL CHECK RESULTS:');
  console.log('='.repeat(80));
  console.log(`Total vehicles in Excel: ${totalExcel}`);
  console.log(`Found in Database: ${foundInDB} (${((foundInDB/totalExcel)*100).toFixed(1)}%)`);
  console.log(`Not found in DB: ${notFound} (${((notFound/totalExcel)*100).toFixed(1)}%)`);
}

checkAllVehicles();
