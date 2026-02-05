require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUpdateVehicles() {
  console.log('🔍 CHECKING WHICH VEHICLES WILL BE UPDATED\n');
  console.log('='.repeat(80));
  
  // Read Excel
  const workbook = XLSX.readFile('scripts/NEW - Consolidated Solflo Template (3).xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Find header row
  const headerRowIndex = rawData.findIndex(row => 
    row && row.some(cell => cell && cell.toString().toLowerCase().includes('reg'))
  );
  
  if (headerRowIndex === -1) {
    console.error('❌ Could not find header row');
    return;
  }
  
  const headers = rawData[headerRowIndex].map(h => h ? h.toString().trim() : '');
  const dataRows = rawData.slice(headerRowIndex + 1);
  
  console.log('📋 Headers found:', headers.slice(0, 10).join(', '), '...\n');
  
  // Convert to objects
  const excelData = dataRows
    .filter(row => row && row.length > 0)
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    })
    .filter(row => row['Reg:'] || row['Fleet number:']);
  
  console.log(`📊 Found ${excelData.length} rows with registration numbers\n`);
  
  // Get all vehicles from DB with pagination
  let allVehicles = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, reg, fleet_number, company')
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('❌ Error fetching vehicles:', error);
      return;
    }
    
    if (!vehicles || vehicles.length === 0) break;
    
    allVehicles = allVehicles.concat(vehicles);
    from += pageSize;
    console.log(`   Loaded ${allVehicles.length} vehicles...`);
    
    if (vehicles.length < pageSize) break;
  }
  
  console.log(`🗄️  Found ${allVehicles.length} vehicles in database\n`);
  
  // Create map of reg to vehicle
  const regMap = new Map();
  const fleetMap = new Map();
  allVehicles.forEach(v => {
    if (v.reg) regMap.set(v.reg.toUpperCase().replace(/\s+/g, ''), v);
    if (v.fleet_number) fleetMap.set(v.fleet_number.toUpperCase().replace(/\s+/g, ''), v);
  });
  
  // Check matches
  const matches = [];
  const noMatches = [];
  
  excelData.forEach(row => {
    const excelReg = (row['Reg:'] || '').toString().trim().toUpperCase().replace(/\s+/g, '');
    const excelFleet = (row['Fleet number:'] || '').toString().trim().toUpperCase().replace(/\s+/g, '');
    if (!excelReg && !excelFleet) return;
    
    let vehicle = excelReg ? regMap.get(excelReg) : null;
    let matchType = 'reg';
    
    if (!vehicle && excelFleet) {
      vehicle = fleetMap.get(excelFleet);
      matchType = 'fleet_number';
    }
    
    if (vehicle) {
      matches.push({ excelRow: row, dbVehicle: vehicle, reg: excelReg || excelFleet, matchType });
    } else {
      noMatches.push(excelReg || excelFleet);
    }
  });
  
  console.log('\n✅ MATCHES FOUND:', matches.length);
  console.log('❌ NO MATCHES:', noMatches.length);
  console.log('\n' + '='.repeat(80));
  
  if (matches.length > 0) {
    console.log('\n📝 SAMPLE MATCHES (first 10):');
    matches.slice(0, 10).forEach(m => {
      console.log(`   ${m.reg} (${m.matchType}) -> DB ID: ${m.dbVehicle.id} (${m.dbVehicle.company})`);
    });
  }
  
  if (noMatches.length > 0) {
    console.log('\n⚠️  SAMPLE NO MATCHES (first 10):');
    noMatches.slice(0, 10).forEach(reg => {
      console.log(`   ${reg}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ CHECK COMPLETE: ${matches.length} vehicles will be updated\n`);
}

checkUpdateVehicles();
