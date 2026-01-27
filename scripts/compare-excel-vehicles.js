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
  console.log('EXCEL VS DATABASE COMPARISON');
  console.log('========================================\n');

  // Read Excel file
  const excelPath = path.join(__dirname, '20 JANUARY 2026 ANNUITY BILLING .xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found:', excelPath);
    return;
  }

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('Excel file loaded successfully');
  console.log('Total rows:', data.length);
  console.log('\n========================================');
  console.log('EXCEL STRUCTURE ANALYSIS');
  console.log('========================================\n');

  // Find header row (look for CLIENT, ACCOUNT NO., etc.)
  let headerRowIndex = -1;
  let headers = [];
  
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => 
      typeof cell === 'string' && 
      (cell.includes('CLIENT') || cell.includes('ACCOUNT') || cell.includes('CODE'))
    )) {
      headerRowIndex = i;
      headers = row.filter(cell => cell && cell.toString().trim() !== '');
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error('Could not find header row in Excel file');
    return;
  }

  console.log('Header row found at index:', headerRowIndex);
  console.log('Headers:', headers);
  console.log('\nFirst 20 data rows:');
  console.log('========================================');

  // Extract data rows (first 20 after header)
  const dataRows = [];
  const startRow = headerRowIndex + 1;
  
  for (let i = startRow; i < Math.min(startRow + 20, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => cell && cell.toString().trim() !== '')) {
      const rowData = {};
      headers.forEach((header, index) => {
        if (header && row[index]) {
          rowData[header] = row[index];
        }
      });
      dataRows.push(rowData);
      
      // Print row for analysis
      console.log(`Row ${i - headerRowIndex}:`, JSON.stringify(rowData, null, 2));
    }
  }

  console.log('\n========================================');
  console.log('DATABASE COMPARISON');
  console.log('========================================\n');

  // Fetch all vehicles from database
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('reg, fleet_number, company, new_account_number, account_number');

  if (error) {
    console.error('Error fetching vehicles:', error);
    return;
  }

  console.log('Database vehicles loaded:', vehicles.length);

  // Create lookup sets for reg and fleet numbers
  const dbRegNumbers = new Set();
  const dbFleetNumbers = new Set();
  
  vehicles.forEach(vehicle => {
    if (vehicle.reg) dbRegNumbers.add(vehicle.reg.toString().trim().toUpperCase());
    if (vehicle.fleet_number) dbFleetNumbers.add(vehicle.fleet_number.toString().trim().toUpperCase());
  });

  console.log('DB Reg numbers:', dbRegNumbers.size);
  console.log('DB Fleet numbers:', dbFleetNumbers.size);

  // Extract vehicle identifiers from Excel data
  const excelVehicles = [];
  
  // Process all data rows (not just first 20)
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (row && row.some(cell => cell && cell.toString().trim() !== '')) {
      const rowData = {};
      headers.forEach((header, index) => {
        if (header && row[index]) {
          rowData[header] = row[index];
        }
      });
      
      // Look for vehicle identifiers in any column
      const vehicleId = findVehicleIdentifier(rowData);
      if (vehicleId) {
        excelVehicles.push({
          identifier: vehicleId,
          client: rowData.CLIENT || '',
          accountNo: rowData['ACCOUNT NO.'] || '',
          code: rowData.CODE || '',
          description: rowData.DESCRIPTION || '',
          rawData: rowData
        });
      }
    }
  }

  console.log('\nExcel vehicles found:', excelVehicles.length);

  // Find missing vehicles
  const missingVehicles = [];
  
  excelVehicles.forEach(excelVehicle => {
    const id = excelVehicle.identifier.toUpperCase();
    const foundInDb = dbRegNumbers.has(id) || dbFleetNumbers.has(id);
    
    if (!foundInDb) {
      missingVehicles.push(excelVehicle);
    }
  });

  console.log('\n========================================');
  console.log('MISSING VEHICLES ANALYSIS');
  console.log('========================================\n');

  console.log('Vehicles in Excel but NOT in database:', missingVehicles.length);

  if (missingVehicles.length > 0) {
    console.log('\nMissing vehicles details:');
    missingVehicles.forEach((vehicle, index) => {
      console.log(`\n${index + 1}. ${vehicle.identifier}`);
      console.log(`   Client: ${vehicle.client}`);
      console.log(`   Account: ${vehicle.accountNo}`);
      console.log(`   Code: ${vehicle.code}`);
      console.log(`   Description: ${vehicle.description}`);
    });

    // Generate INSERT statements for missing vehicles
    console.log('\n========================================');
    console.log('SUGGESTED INSERT STATEMENTS');
    console.log('========================================\n');

    missingVehicles.slice(0, 10).forEach((vehicle, index) => {
      const insertSQL = generateInsertStatement(vehicle);
      console.log(`-- Missing vehicle ${index + 1}: ${vehicle.identifier}`);
      console.log(insertSQL);
      console.log('');
    });
  }

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Excel vehicles: ${excelVehicles.length}`);
  console.log(`Database vehicles: ${vehicles.length}`);
  console.log(`Missing from database: ${missingVehicles.length}`);
}

function findVehicleIdentifier(rowData) {
  // Look for vehicle identifiers in common columns
  const possibleColumns = ['FLEET', 'REG', 'VEHICLE', 'UNIT', 'ID'];
  
  for (const [key, value] of Object.entries(rowData)) {
    if (value && typeof value === 'string') {
      const keyUpper = key.toUpperCase();
      const valueStr = value.toString().trim();
      
      // Check if this looks like a vehicle identifier
      if (possibleColumns.some(col => keyUpper.includes(col)) && valueStr.length > 0) {
        return valueStr;
      }
      
      // Also check if the value looks like a vehicle reg/fleet pattern
      if (valueStr.match(/^[A-Z0-9]{2,10}$/i)) {
        return valueStr;
      }
    }
  }
  
  return null;
}

function generateInsertStatement(vehicle) {
  const now = new Date().toISOString();
  const uuid = 'gen_random_uuid()';
  
  return `INSERT INTO "public"."vehicles" (
    "created_at", "company", "new_account_number", "unique_id", 
    "fleet_number", "reg", "account_number"
  ) VALUES (
    '${now}', 
    '${vehicle.client.replace(/'/g, "''")}', 
    '${vehicle.accountNo.replace(/'/g, "''")}', 
    ${uuid}, 
    '${vehicle.identifier.replace(/'/g, "''")}', 
    '${vehicle.identifier.replace(/'/g, "''")}', 
    '${vehicle.accountNo.replace(/'/g, "''")}'
  );`;
}

main().catch(console.error);