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

async function main() {
  console.log('========================================');
  console.log('ACCOUNT-BASED VEHICLE COMPARISON');
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

  // Group Excel data by account number
  const excelByAccount = {};
  excelData.forEach(row => {
    const accountNo = row['ACCOUNT NO.'];
    if (accountNo && accountNo.toString().trim() !== '') {
      const account = accountNo.toString().trim().toUpperCase();
      if (!excelByAccount[account]) {
        excelByAccount[account] = {
          client: row.CLIENT || '',
          services: [],
          totalAmount: 0
        };
      }
      excelByAccount[account].services.push({
        code: row.CODE || '',
        description: row.DESCRIPTION || '',
        qty: row.QTY || '',
        priceEx: parseFloat(row['PRICE EX.']) || 0,
        priceIncl: parseFloat(row['PRICE INCL.']) || 0,
        totalIncl: parseFloat(row['TOTAL INCL.']) || 0
      });
      excelByAccount[account].totalAmount += parseFloat(row['TOTAL INCL.']) || 0;
    }
  });

  console.log(`Excel accounts found: ${Object.keys(excelByAccount).length}`);

  // Fetch all vehicles from database
  const dbVehicles = await fetchAllVehicles();
  console.log(`Database vehicles loaded: ${dbVehicles.length}`);

  // Group database vehicles by account number
  const dbByAccount = {};
  dbVehicles.forEach(vehicle => {
    const accounts = [
      vehicle.new_account_number,
      vehicle.account_number
    ].filter(acc => acc && acc.toString().trim() !== '');
    
    accounts.forEach(accountNo => {
      const account = accountNo.toString().trim().toUpperCase();
      if (!dbByAccount[account]) {
        dbByAccount[account] = [];
      }
      dbByAccount[account].push(vehicle);
    });
  });

  console.log(`Database accounts found: ${Object.keys(dbByAccount).length}`);

  // Find accounts in Excel but not in database
  const missingAccounts = [];
  const accountsWithMissingVehicles = [];
  
  Object.keys(excelByAccount).forEach(account => {
    if (!dbByAccount[account]) {
      missingAccounts.push({
        account,
        client: excelByAccount[account].client,
        serviceCount: excelByAccount[account].services.length,
        totalAmount: excelByAccount[account].totalAmount,
        services: excelByAccount[account].services
      });
    } else {
      // Account exists but check if vehicle count matches service count
      const dbVehicleCount = dbByAccount[account].length;
      const excelServiceCount = excelByAccount[account].services.length;
      
      if (excelServiceCount > dbVehicleCount) {
        accountsWithMissingVehicles.push({
          account,
          client: excelByAccount[account].client,
          dbVehicles: dbVehicleCount,
          excelServices: excelServiceCount,
          missingCount: excelServiceCount - dbVehicleCount,
          totalAmount: excelByAccount[account].totalAmount,
          services: excelByAccount[account].services,
          dbVehicleList: dbByAccount[account]
        });
      }
    }
  });

  console.log('\n========================================');
  console.log('ANALYSIS RESULTS');
  console.log('========================================\n');

  console.log(`Accounts completely missing from database: ${missingAccounts.length}`);
  console.log(`Accounts with potential missing vehicles: ${accountsWithMissingVehicles.length}`);

  // Generate CSV for missing accounts
  const csvPath = path.join(__dirname, 'missing_accounts_grouped.csv');
  const csvHeaders = [
    'Account_Number',
    'Client_Name',
    'Status',
    'DB_Vehicles',
    'Excel_Services',
    'Missing_Count',
    'Total_Amount',
    'Service_Codes',
    'Service_Descriptions'
  ];

  let csvContent = csvHeaders.join(',') + '\n';
  
  // Add completely missing accounts
  missingAccounts.forEach(account => {
    const serviceCodes = account.services.map(s => s.code).join('; ');
    const serviceDescs = account.services.map(s => s.description).join('; ');
    
    const row = [
      `"${account.account}"`,
      `"${account.client}"`,
      `"COMPLETELY_MISSING"`,
      `"0"`,
      `"${account.serviceCount}"`,
      `"${account.serviceCount}"`,
      `"${account.totalAmount.toFixed(2)}"`,
      `"${serviceCodes}"`,
      `"${serviceDescs}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  // Add accounts with missing vehicles
  accountsWithMissingVehicles.forEach(account => {
    const serviceCodes = account.services.map(s => s.code).join('; ');
    const serviceDescs = account.services.map(s => s.description).join('; ');
    
    const row = [
      `"${account.account}"`,
      `"${account.client}"`,
      `"PARTIAL_MISSING"`,
      `"${account.dbVehicles}"`,
      `"${account.excelServices}"`,
      `"${account.missingCount}"`,
      `"${account.totalAmount.toFixed(2)}"`,
      `"${serviceCodes}"`,
      `"${serviceDescs}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  fs.writeFileSync(csvPath, csvContent);

  console.log('\n========================================');
  console.log('SUMMARY BY ACCOUNT');
  console.log('========================================\n');

  console.log('TOP 10 COMPLETELY MISSING ACCOUNTS:');
  missingAccounts
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10)
    .forEach((account, index) => {
      console.log(`${index + 1}. ${account.account} - ${account.client}`);
      console.log(`   Services: ${account.serviceCount}, Amount: R${account.totalAmount.toFixed(2)}`);
    });

  console.log('\nTOP 10 ACCOUNTS WITH MISSING VEHICLES:');
  accountsWithMissingVehicles
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, 10)
    .forEach((account, index) => {
      console.log(`${index + 1}. ${account.account} - ${account.client}`);
      console.log(`   DB: ${account.dbVehicles}, Excel: ${account.excelServices}, Missing: ${account.missingCount}`);
      console.log(`   Amount: R${account.totalAmount.toFixed(2)}`);
    });

  console.log('\n========================================');
  console.log('FINAL SUMMARY');
  console.log('========================================');
  console.log(`Total Excel accounts: ${Object.keys(excelByAccount).length}`);
  console.log(`Total DB accounts: ${Object.keys(dbByAccount).length}`);
  console.log(`Completely missing accounts: ${missingAccounts.length}`);
  console.log(`Accounts with missing vehicles: ${accountsWithMissingVehicles.length}`);
  console.log(`Total missing revenue: R${(missingAccounts.reduce((sum, acc) => sum + acc.totalAmount, 0) + accountsWithMissingVehicles.reduce((sum, acc) => sum + acc.totalAmount, 0)).toFixed(2)}`);
  console.log(`CSV file generated: ${csvPath}`);
}

main().catch(console.error);