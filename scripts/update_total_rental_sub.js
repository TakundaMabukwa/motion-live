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
    const { data } = await supabase
      .from('vehicles')
      .select('id, fleet_number, reg')
      .range(from, from + pageSize - 1);
    
    if (!data || data.length === 0) break;
    allVehicles = allVehicles.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return allVehicles;
}

async function updateTotalRentalSub() {
  console.log('Fetching all vehicles from database...\n');
  const allVehicles = await getAllVehicles();
  
  const dbByFleet = new Map();
  const dbByReg = new Map();
  
  allVehicles.forEach(item => {
    if (item.fleet_number) dbByFleet.set(normalize(item.fleet_number), item);
    if (item.reg) dbByReg.set(normalize(item.reg), item);
  });

  const workbook = XLSX.readFile('./scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const toUpdate = [];

  data.forEach((row, index) => {
    if (index < 9) return;
    
    const group = row[3]?.toString().trim();
    const newReg = row[4]?.toString().trim();
    const priceEx = parseFloat(row[row.length - 3]) || 0; // PRICE EX is 3rd from last
    
    if (!group && !newReg) return;
    
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
    
    if (dbVehicle) {
      toUpdate.push({
        id: dbVehicle.id,
        reg: dbVehicle.reg,
        fleet_number: dbVehicle.fleet_number,
        total_rental_sub: priceEx
      });
    }
  });

  console.log(`Total vehicles to update: ${toUpdate.length}\n`);
  
  if (toUpdate.length > 0) {
    console.log('First 10 updates:');
    console.log('='.repeat(80));
    toUpdate.slice(0, 10).forEach(v => {
      console.log(`${v.reg || v.fleet_number} | R${v.total_rental_sub}`);
    });
    
    console.log('\n\nUpdating total_rental_sub...');
    
    let updated = 0;
    for (const vehicle of toUpdate) {
      const { error } = await supabase
        .from('vehicles')
        .update({ total_rental_sub: vehicle.total_rental_sub })
        .eq('id', vehicle.id);
      
      if (!error) updated++;
      
      if (updated % 100 === 0) {
        console.log(`Updated ${updated}/${toUpdate.length}...`);
      }
    }
    
    console.log(`\n✅ Updated ${updated} vehicles with total_rental_sub (PRICE EX)`);
  }
}

updateTotalRentalSub();
