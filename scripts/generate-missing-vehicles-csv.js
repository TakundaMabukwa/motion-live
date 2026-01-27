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

async function fetchAllVehicles() {
  console.log('Fetching all vehicles from database...');
  let allVehicles = [];
  let from = 0;
  const limit = 1000;

  while (true) {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('reg, fleet_number, company, new_account_number, account_number')
      .range(from, from + limit - 1)
      .order('id');

    if (error) {
      console.error('Error fetching vehicles:', error);
      break;
    }

    if (!vehicles || vehicles.length === 0) break;

    allVehicles = [...allVehicles, ...vehicles];
    console.log(`Fetched ${vehicles.length} vehicles (total: ${allVehicles.length})`);

    if (vehicles.length < limit) break;
    from += limit;
  }

  return allVehicles;
}

function extractVehicleIdentifiers(excelData) {
  const vehicles = new Set();
  
  excelData.forEach(row => {
    // Look for potential vehicle identifiers in all columns
    Object.values(row).forEach(value => {
      if (value && typeof value === 'string') {
        const cleanValue = value.toString().trim();
        
        // Check if it looks like a vehicle reg/fleet number
        if (cleanValue.match(/^[A-Z0-9]{2,15}$/i) && 
            !cleanValue.match(/^(MONTHLY|RENTAL|SKYLINK|BEAME|ANNUITY|SUBS|BOM)$/i)) {
          vehicles.add(cleanValue.toUpperCase());
        }
      }
    });
  });

  return Array.from(vehicles);
}

async function main() {
  console.log('========================================');
  console.log('MISSING VEHICLES CSV GENERATOR');
  console.log('========================================\n');

  // Read Excel file
  const excelPath = path.join(__dirname, '20 JANUARY 2026 ANNUITY BILLING .xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found:', excelPath);
    return;
  }

  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const excelData = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Excel data loaded: ${excelData.length} rows`);

  // Extract vehicle identifiers from Excel
  const excelVehicles = extractVehicleIdentifiers(excelData);
  console.log(`Unique vehicle identifiers found in Excel: ${excelVehicles.length}`);

  // Fetch all vehicles from database
  const dbVehicles = await fetchAllVehicles();
  console.log(`Database vehicles loaded: ${dbVehicles.length}`);

  // Create lookup sets for database vehicles
  const dbRegNumbers = new Set();
  const dbFleetNumbers = new Set();
  
  dbVehicles.forEach(vehicle => {
    if (vehicle.reg) dbRegNumbers.add(vehicle.reg.toString().trim().toUpperCase());
    if (vehicle.fleet_number) dbFleetNumbers.add(vehicle.fleet_number.toString().trim().toUpperCase());
  });

  console.log(`DB Reg numbers: ${dbRegNumbers.size}`);
  console.log(`DB Fleet numbers: ${dbFleetNumbers.size}`);

  // Find missing vehicles
  const missingVehicles = [];
  
  excelVehicles.forEach(vehicleId => {
    const id = vehicleId.toUpperCase();
    const foundInDb = dbRegNumbers.has(id) || dbFleetNumbers.has(id);
    
    if (!foundInDb) {
      // Find the Excel row with this vehicle ID to get more context
      const excelRow = excelData.find(row => 
        Object.values(row).some(value => 
          value && value.toString().trim().toUpperCase() === id
        )
      );

      missingVehicles.push({
        vehicle_id: vehicleId,
        client: excelRow?.CLIENT || '',
        account_no: excelRow?.['ACCOUNT NO.'] || '',
        code: excelRow?.CODE || '',
        description: excelRow?.DESCRIPTION || '',
        qty: excelRow?.QTY || '',
        price_ex: excelRow?.['PRICE EX.'] || '',
        price_incl: excelRow?.['PRICE INCL.'] || '',
        total_incl: excelRow?.['TOTAL INCL.'] || ''
      });
    }
  });

  console.log(`\nMissing vehicles found: ${missingVehicles.length}`);

  // Generate CSV
  const csvPath = path.join(__dirname, 'missing_vehicles.csv');
  const csvHeaders = [
    'Vehicle_ID',
    'Client',
    'Account_No',
    'Code',
    'Description',
    'Qty',
    'Price_Ex',
    'Price_Incl',
    'Total_Incl'
  ];

  let csvContent = csvHeaders.join(',') + '\n';
  
  missingVehicles.forEach(vehicle => {
    const row = [
      `"${vehicle.vehicle_id}"`,
      `"${vehicle.client}"`,
      `"${vehicle.account_no}"`,
      `"${vehicle.code}"`,
      `"${vehicle.description}"`,
      `"${vehicle.qty}"`,
      `"${vehicle.price_ex}"`,
      `"${vehicle.price_incl}"`,
      `"${vehicle.total_incl}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  fs.writeFileSync(csvPath, csvContent);

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Excel vehicle identifiers: ${excelVehicles.length}`);
  console.log(`Database vehicles: ${dbVehicles.length}`);
  console.log(`Missing from database: ${missingVehicles.length}`);
  console.log(`CSV file generated: ${csvPath}`);

  // Show first 10 missing vehicles
  console.log('\nFirst 10 missing vehicles:');
  missingVehicles.slice(0, 10).forEach((vehicle, index) => {
    console.log(`${index + 1}. ${vehicle.vehicle_id} - ${vehicle.client} (${vehicle.account_no})`);
  });
}

main().catch(console.error);