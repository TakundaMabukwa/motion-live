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

async function crossCheckPricing() {
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('fleet_number, reg, total_sub');

  const dbVehicles = new Map();
  
  allVehicles.forEach(item => {
    if (item.fleet_number) {
      dbVehicles.set(normalize(item.fleet_number), item.total_sub);
    }
    if (item.reg) {
      dbVehicles.set(normalize(item.reg), item.total_sub);
    }
  });

  const workbook = XLSX.readFile('./scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let totalExcel = 0;
  let foundInDB = 0;
  let withPricing = 0;
  let missingPricing = 0;
  let priceMismatch = 0;

  const missing = [];
  const mismatch = [];

  data.forEach((row, index) => {
    if (index < 9) return; // Skip header rows
    
    const company = row[0]?.toString().trim();
    const fleetOrReg = row[3]?.toString().trim(); // Column 3 is GROUP
    const excelPrice = parseFloat(row[row.length - 1]) || 0;
    
    if (!fleetOrReg) return;
    
    totalExcel++;
    const normalized = normalize(fleetOrReg);
    
    if (dbVehicles.has(normalized)) {
      foundInDB++;
      const dbPrice = dbVehicles.get(normalized);
      
      if (dbPrice && dbPrice > 0) {
        withPricing++;
        if (Math.abs(dbPrice - excelPrice) > 0.01) {
          priceMismatch++;
          if (mismatch.length < 10) {
            mismatch.push({
              vehicle: fleetOrReg,
              company,
              excelPrice,
              dbPrice
            });
          }
        }
      } else {
        missingPricing++;
        if (missing.length < 10) {
          missing.push({
            vehicle: fleetOrReg,
            company,
            excelPrice
          });
        }
      }
    }
  });

  console.log('CROSS-CHECK RESULTS:');
  console.log('='.repeat(80));
  console.log(`Total vehicles in Excel: ${totalExcel}`);
  console.log(`Found in Database: ${foundInDB}`);
  console.log(`With pricing in DB: ${withPricing}`);
  console.log(`Missing pricing in DB: ${missingPricing}`);
  console.log(`Price mismatches: ${priceMismatch}`);
  console.log(`Not found in DB: ${totalExcel - foundInDB}`);

  if (missing.length > 0) {
    console.log('\n\nFirst 10 vehicles missing pricing:');
    console.log('='.repeat(80));
    missing.forEach(m => {
      console.log(`${m.vehicle} | ${m.company} | Excel: R${m.excelPrice}`);
    });
  }

  if (mismatch.length > 0) {
    console.log('\n\nFirst 10 price mismatches:');
    console.log('='.repeat(80));
    mismatch.forEach(m => {
      console.log(`${m.vehicle} | Excel: R${m.excelPrice} | DB: R${m.dbPrice}`);
    });
  }
}

crossCheckPricing();
