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

function cleanString(str) {
  if (!str) return '';
  return str.toString().replace(/\s+/g, '').toLowerCase();
}

function generateAccountNumber(clientName) {
  if (!clientName) return 'UNKNOWN-0001';
  
  // Take first 3-6 characters of company name, remove spaces and special chars
  const cleanName = clientName.toString()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 6);
  
  return `${cleanName}-0001`;
}

async function fetchAllVehicles() {
  console.log('Fetching all vehicles from database...');
  let allVehicles = [];
  let from = 0;
  const limit = 1000;

  while (true) {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('reg, fleet_number, company, new_account_number')
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

async function main() {
  console.log('========================================');
  console.log('VEHICLE MATCHING AND ACCOUNT LINKING');
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
  
  // Convert to JSON starting from row 9 (header row is at index 8)
  const excelData = XLSX.utils.sheet_to_json(worksheet, { 
    range: 8,
    header: ['CLIENT', 'ACCOUNT_NO', 'DOC_NO', 'GROUP', 'NEW_REGISTRATION', 'ASSET_BARCODE', 'PROJECT', 'CODE', 'DESCRIPTION', 'COMMENTS', 'SUPPLIER', 'HOLDING_COMPANY', 'QTY', 'DISCOUNT', 'COST_EX', 'PRICE_EX', 'PRICE_INCL', 'TOTAL_INCL']
  });

  console.log(`Excel data loaded: ${excelData.length} rows`);

  // Fetch all vehicles from database
  const dbVehicles = await fetchAllVehicles();
  console.log(`Database vehicles loaded: ${dbVehicles.length}`);

  // Create lookup maps for database vehicles
  const dbByCompany = new Map();
  const dbByAccountNumber = new Map();
  
  dbVehicles.forEach(vehicle => {
    const cleanCompany = cleanString(vehicle.company);
    const cleanAccount = cleanString(vehicle.new_account_number);
    
    if (cleanCompany) {
      if (!dbByCompany.has(cleanCompany)) {
        dbByCompany.set(cleanCompany, []);
      }
      dbByCompany.get(cleanCompany).push(vehicle);
    }
    
    if (cleanAccount) {
      if (!dbByAccountNumber.has(cleanAccount)) {
        dbByAccountNumber.set(cleanAccount, []);
      }
      dbByAccountNumber.get(cleanAccount).push(vehicle);
    }
  });

  console.log(`Company lookup map: ${dbByCompany.size} entries`);
  console.log(`Account lookup map: ${dbByAccountNumber.size} entries`);

  // Process Excel data and find matches
  const results = [];
  const processedAccounts = new Set();
  
  excelData.forEach((row, index) => {
    if (!row.CLIENT || !row.GROUP) return;
    
    const cleanClient = cleanString(row.CLIENT);
    const cleanAccountNo = cleanString(row.ACCOUNT_NO);
    const vehicleId = row.GROUP ? row.GROUP.toString().trim() : '';
    
    // Skip if we've already processed this account
    const accountKey = `${cleanClient}-${cleanAccountNo}`;
    if (processedAccounts.has(accountKey)) return;
    processedAccounts.add(accountKey);
    
    let matchedAccount = null;
    let matchType = 'NO_MATCH';
    
    // Try to match by account number first
    if (cleanAccountNo && dbByAccountNumber.has(cleanAccountNo)) {
      const matches = dbByAccountNumber.get(cleanAccountNo);
      matchedAccount = matches[0].new_account_number;
      matchType = 'ACCOUNT_MATCH';
    }
    // Try to match by company name
    else if (cleanClient && dbByCompany.has(cleanClient)) {
      const matches = dbByCompany.get(cleanClient);
      matchedAccount = matches[0].new_account_number;
      matchType = 'COMPANY_MATCH';
    }
    // Generate new account number
    else {
      matchedAccount = generateAccountNumber(row.CLIENT);
      matchType = 'GENERATED';
    }
    
    results.push({
      excelClient: row.CLIENT,
      excelAccountNo: row.ACCOUNT_NO,
      vehicleId: vehicleId,
      matchedNewAccountNumber: matchedAccount,
      matchType: matchType,
      serviceCode: row.CODE || '',
      serviceDescription: row.DESCRIPTION || '',
      totalAmount: parseFloat(row.TOTAL_INCL) || 0
    });
  });

  // Generate CSV
  const csvPath = path.join(__dirname, 'vehicle_account_mapping.csv');
  const csvHeaders = [
    'Excel_Client',
    'Excel_Account_No',
    'Vehicle_ID',
    'Matched_New_Account_Number',
    'Match_Type',
    'Service_Code',
    'Service_Description',
    'Total_Amount'
  ];

  let csvContent = csvHeaders.join(',') + '\n';
  
  results.forEach(result => {
    const row = [
      `"${result.excelClient}"`,
      `"${result.excelAccountNo}"`,
      `"${result.vehicleId}"`,
      `"${result.matchedNewAccountNumber}"`,
      `"${result.matchType}"`,
      `"${result.serviceCode}"`,
      `"${result.serviceDescription}"`,
      `"${result.totalAmount.toFixed(2)}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  fs.writeFileSync(csvPath, csvContent);

  // Summary statistics
  const matchStats = {
    ACCOUNT_MATCH: results.filter(r => r.matchType === 'ACCOUNT_MATCH').length,
    COMPANY_MATCH: results.filter(r => r.matchType === 'COMPANY_MATCH').length,
    GENERATED: results.filter(r => r.matchType === 'GENERATED').length,
    NO_MATCH: results.filter(r => r.matchType === 'NO_MATCH').length
  };

  console.log('\n========================================');
  console.log('MATCHING RESULTS');
  console.log('========================================\n');

  console.log(`Total unique accounts processed: ${results.length}`);
  console.log(`Account number matches: ${matchStats.ACCOUNT_MATCH}`);
  console.log(`Company name matches: ${matchStats.COMPANY_MATCH}`);
  console.log(`Generated new accounts: ${matchStats.GENERATED}`);
  console.log(`No matches found: ${matchStats.NO_MATCH}`);

  console.log('\nTop 10 Account Matches:');
  results.filter(r => r.matchType === 'ACCOUNT_MATCH').slice(0, 10).forEach((result, index) => {
    console.log(`${index + 1}. ${result.excelClient} (${result.excelAccountNo}) -> ${result.matchedNewAccountNumber}`);
  });

  console.log('\nTop 10 Company Matches:');
  results.filter(r => r.matchType === 'COMPANY_MATCH').slice(0, 10).forEach((result, index) => {
    console.log(`${index + 1}. ${result.excelClient} -> ${result.matchedNewAccountNumber}`);
  });

  console.log('\nTop 10 Generated Accounts:');
  results.filter(r => r.matchType === 'GENERATED').slice(0, 10).forEach((result, index) => {
    console.log(`${index + 1}. ${result.excelClient} -> ${result.matchedNewAccountNumber}`);
  });

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`CSV file generated: ${csvPath}`);
  console.log(`Total revenue mapped: R${results.reduce((sum, r) => sum + r.totalAmount, 0).toFixed(2)}`);
  console.log(`Match rate: ${((matchStats.ACCOUNT_MATCH + matchStats.COMPANY_MATCH) / results.length * 100).toFixed(1)}%`);
}

main().catch(console.error);