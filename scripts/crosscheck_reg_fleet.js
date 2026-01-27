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

async function crossCheckByRegAndFleet() {
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('fleet_number, reg, total_sub');

  const dbByFleet = new Map();
  const dbByReg = new Map();
  
  allVehicles.forEach(item => {
    if (item.fleet_number) {
      dbByFleet.set(normalize(item.fleet_number), item);
    }
    if (item.reg) {
      dbByReg.set(normalize(item.reg), item);
    }
  });

  const workbook = XLSX.readFile('./scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let totalExcel = 0;
  let foundInDB = 0;
  let withPricing = 0;
  let missingPricing = 0;

  const missing = [];

  data.forEach((row, index) => {
    if (index < 9) return;
    
    const company = row[0]?.toString().trim();
    const group = row[3]?.toString().trim();
    const newReg = row[4]?.toString().trim();
    const excelPrice = parseFloat(row[row.length - 1]) || 0;
    
    if (!group && !newReg) return;
    
    totalExcel++;
    
    let dbVehicle = null;
    
    // Try matching by group (fleet_number or reg)
    if (group) {
      const normalizedGroup = normalize(group);
      dbVehicle = dbByFleet.get(normalizedGroup) || dbByReg.get(normalizedGroup);
      
      // If not found, try each part if hyphenated
      if (!dbVehicle && group.includes('-')) {
        const parts = group.split('-');
        for (const part of parts) {
          if (part.trim()) {
            const normalizedPart = normalize(part);
            dbVehicle = dbByFleet.get(normalizedPart) || dbByReg.get(normalizedPart);
            if (dbVehicle) break;
          }
        }
      }
    }
    
    // Try matching by newReg
    if (!dbVehicle && newReg) {
      const normalizedReg = normalize(newReg);
      dbVehicle = dbByReg.get(normalizedReg) || dbByFleet.get(normalizedReg);
      
      // If not found, try each part if hyphenated
      if (!dbVehicle && newReg.includes('-')) {
        const parts = newReg.split('-');
        for (const part of parts) {
          if (part.trim()) {
            const normalizedPart = normalize(part);
            dbVehicle = dbByReg.get(normalizedPart) || dbByFleet.get(normalizedPart);
            if (dbVehicle) break;
          }
        }
      }
    }
    
    if (dbVehicle) {
      foundInDB++;
      
      if (dbVehicle.total_sub && dbVehicle.total_sub > 0) {
        withPricing++;
      } else {
        missingPricing++;
        if (missing.length < 20) {
          missing.push({
            group,
            newReg,
            company,
            excelPrice,
            dbFleet: dbVehicle.fleet_number,
            dbReg: dbVehicle.reg
          });
        }
      }
    }
  });

  console.log('CROSS-CHECK RESULTS (Matching by reg AND fleet_number):');
  console.log('='.repeat(80));
  console.log(`Total vehicles in Excel: ${totalExcel}`);
  console.log(`Found in Database: ${foundInDB} (${((foundInDB/totalExcel)*100).toFixed(1)}%)`);
  console.log(`With pricing in DB: ${withPricing} (${((withPricing/foundInDB)*100).toFixed(1)}%)`);
  console.log(`Missing pricing in DB: ${missingPricing} (${((missingPricing/foundInDB)*100).toFixed(1)}%)`);
  console.log(`Not found in DB: ${totalExcel - foundInDB} (${(((totalExcel - foundInDB)/totalExcel)*100).toFixed(1)}%)`);

  if (missing.length > 0) {
    console.log('\n\nFirst 20 vehicles found but missing pricing:');
    console.log('='.repeat(80));
    missing.forEach(m => {
      console.log(`Excel: ${m.group || m.newReg} | DB: ${m.dbReg || m.dbFleet} | ${m.company} | Excel Price: R${m.excelPrice}`);
    });
  }
}

crossCheckByRegAndFleet();
