const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
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
  console.log('STEP 1: READING EXCEL FILE');
  console.log('========================================\n');

  // Read the Excel file
  const excelPath = path.join(__dirname, '20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`📄 Sheet Name: ${sheetName}`);
  console.log(`📊 Total Rows: ${data.length}\n`);
  
  // Get headers (row 8 based on the output)
  const headers = data[8];
  console.log('📋 HEADERS:');
  headers.forEach((header, index) => {
    console.log(`   ${index}: ${header}`);
  });
  
  console.log('\n📝 FIRST 20 ROWS OF DATA:\n');
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (i === 0) {
      console.log(`Row ${i} (HEADERS):`, row);
    } else {
      console.log(`Row ${i}:`, row);
    }
  }
  
  console.log('\n========================================');
  console.log('STEP 2: FETCHING ALL VEHICLES FROM DB');
  console.log('========================================\n');
  
  // Fetch all vehicles from database
  let allVehicles = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('reg, fleet_number, new_account_number, account_number')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('Error fetching vehicles:', error.message);
      break;
    }
    
    if (!vehicles || vehicles.length === 0) break;
    
    allVehicles = allVehicles.concat(vehicles);
    console.log(`Fetched page ${page + 1}: ${vehicles.length} vehicles (total: ${allVehicles.length})`);
    
    if (vehicles.length < pageSize) break;
    page++;
  }
  
  console.log(`\n✅ Total vehicles in DB: ${allVehicles.length}\n`);
  
  // Create lookup maps for quick matching
  const regMap = new Map();
  const fleetMap = new Map();
  
  allVehicles.forEach(vehicle => {
    if (vehicle.reg) {
      regMap.set(vehicle.reg.toUpperCase().trim(), vehicle);
    }
    if (vehicle.fleet_number) {
      fleetMap.set(vehicle.fleet_number.toUpperCase().trim(), vehicle);
    }
  });
  
  console.log(`📊 DB Stats:`);
  console.log(`   - Vehicles with reg: ${regMap.size}`);
  console.log(`   - Vehicles with fleet_number: ${fleetMap.size}`);
  
  console.log('\n========================================');
  console.log('STEP 3: COMPARING EXCEL WITH DB');
  console.log('========================================\n');
  
  // Find column indices (adjust based on actual headers)
  const clientColIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('client'));
  const accountColIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('account'));
  const regColIndex = headers.findIndex(h => h && (h.toString().toLowerCase().includes('reg') || h.toString().toLowerCase().includes('group')));
  const fleetColIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('fleet'));
  
  console.log(`Column Indices:`);
  console.log(`   - Client: ${clientColIndex}`);
  console.log(`   - Account: ${accountColIndex}`);
  console.log(`   - Reg/Group: ${regColIndex}`);
  console.log(`   - Fleet: ${fleetColIndex}\n`);
  
  const notInDB = [];
  const inDB = [];
  
  // Skip header rows (start from row 9)
  for (let i = 9; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const client = row[clientColIndex] || '';
    const account = row[accountColIndex] || '';
    const group = row[3] ? row[3].toString().toUpperCase().trim() : ''; // GROUP column
    
    // Skip if no group
    if (!group) continue;
    
    // Check if exists in DB by matching GROUP to either reg OR fleet_number
    const foundByReg = regMap.has(group);
    const foundByFleet = fleetMap.has(group);
    
    if (foundByReg || foundByFleet) {
      inDB.push({ row: i, client, account, group, matchType: foundByReg ? 'reg' : 'fleet_number' });
    } else {
      notInDB.push({ row: i, client, account, group, fullRow: row });
    }
  }
  
  console.log(`✅ Vehicles found in DB: ${inDB.length}`);
  console.log(`❌ Vehicles NOT in DB: ${notInDB.length}\n`);
  
  console.log('\n========================================');
  console.log('STEP 4: GROUPING BY ACCOUNT NUMBER');
  console.log('========================================\n');
  
  // Group by account number
  const groupedByAccount = {};
  notInDB.forEach(item => {
    const accountKey = item.account || 'NO_ACCOUNT';
    if (!groupedByAccount[accountKey]) {
      groupedByAccount[accountKey] = [];
    }
    groupedByAccount[accountKey].push(item);
  });
  
  console.log(`📊 Grouped into ${Object.keys(groupedByAccount).length} account numbers:\n`);
  Object.entries(groupedByAccount).forEach(([account, items]) => {
    console.log(`   ${account}: ${items.length} vehicles`);
  });
  
  console.log('\n========================================');
  console.log('STEP 5: GENERATING OUTPUT CSV');
  console.log('========================================\n');
  
  // Generate CSV output with same format as Excel
  const outputLines = [];
  outputLines.push(headers.join(','));
  
  // Add all rows that are NOT in DB, grouped by account
  Object.entries(groupedByAccount).sort().forEach(([account, items]) => {
    items.forEach(item => {
      outputLines.push(item.fullRow.map(cell => `"${cell || ''}"`).join(','));
    });
  });
  
  const outputPath = path.join(__dirname, 'vehicles_not_in_db.csv');
  fs.writeFileSync(outputPath, outputLines.join('\n'));
  
  console.log(`✅ Output saved to: ${outputPath}`);
  console.log(`📊 Total records in output: ${outputLines.length - 1}`);
  
  // Also create a summary file
  const summaryLines = [];
  summaryLines.push('ACCOUNT_NUMBER,CLIENT,VEHICLE_COUNT,VEHICLES');
  
  Object.entries(groupedByAccount).sort().forEach(([account, items]) => {
    const client = items[0].client;
    const vehicles = items.map(i => i.reg || i.fleet).join('; ');
    summaryLines.push(`"${account}","${client}",${items.length},"${vehicles}"`);
  });
  
  const summaryPath = path.join(__dirname, 'vehicles_not_in_db_summary.csv');
  fs.writeFileSync(summaryPath, summaryLines.join('\n'));
  
  console.log(`✅ Summary saved to: ${summaryPath}\n`);
  
  console.log('========================================');
  console.log('COMPLETE!');
  console.log('========================================');
}

main().catch(console.error);
