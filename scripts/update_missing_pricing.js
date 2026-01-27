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

async function updateMissingPricing() {
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('id, fleet_number, reg, total_sub');

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

  const toUpdate = [];

  data.forEach((row, index) => {
    if (index < 9) return;
    
    const group = row[3]?.toString().trim();
    const newReg = row[4]?.toString().trim();
    const excelPrice = parseFloat(row[row.length - 1]) || 0;
    
    if (!group && !newReg) return;
    if (!excelPrice || excelPrice === 0) return;
    
    let dbVehicle = null;
    
    if (group) {
      const normalizedGroup = normalize(group);
      dbVehicle = dbByFleet.get(normalizedGroup) || dbByReg.get(normalizedGroup);
      
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
    
    if (!dbVehicle && newReg) {
      const normalizedReg = normalize(newReg);
      dbVehicle = dbByReg.get(normalizedReg) || dbByFleet.get(normalizedReg);
      
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
    
    if (dbVehicle && (!dbVehicle.total_sub || dbVehicle.total_sub === 0)) {
      toUpdate.push({
        id: dbVehicle.id,
        reg: dbVehicle.reg,
        fleet_number: dbVehicle.fleet_number,
        total_sub: excelPrice
      });
    }
  });

  console.log(`Total vehicles to update: ${toUpdate.length}\n`);
  
  if (toUpdate.length > 0) {
    console.log('First 10 updates:');
    console.log('='.repeat(80));
    toUpdate.slice(0, 10).forEach(v => {
      console.log(`${v.reg || v.fleet_number} | R${v.total_sub}`);
    });
    
    console.log('\n\nUpdating...');
    
    let updated = 0;
    for (const vehicle of toUpdate) {
      const { error } = await supabase
        .from('vehicles')
        .update({ total_sub: vehicle.total_sub })
        .eq('id', vehicle.id);
      
      if (!error) updated++;
    }
    
    console.log(`\n✅ Updated ${updated} vehicles with pricing`);
  }
}

updateMissingPricing();
