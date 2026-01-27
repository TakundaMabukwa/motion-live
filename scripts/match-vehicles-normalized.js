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

function normalizeCompanyName(name) {
  if (!name) return '';
  
  return name.toString()
    .toLowerCase()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[^\w]/g, '') // Remove all non-alphanumeric characters
    .replace(/ptyltd|ptylimited|pty|ltd|limited|cc|divofmscsa|divofmscsa2005|divofmscsa2005ptyld/g, '') // Remove common company suffixes
    .replace(/southafrica|sa/g, '') // Remove location indicators
    .trim();
}

function generateAccountNumber(clientName) {
  if (!clientName) return 'UNKNOWN-0001';
  
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
  console.log('IMPROVED VEHICLE MATCHING WITH NORMALIZATION');
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
  
  const excelData = XLSX.utils.sheet_to_json(worksheet, { 
    range: 8,
    header: ['CLIENT', 'ACCOUNT_NO', 'DOC_NO', 'GROUP', 'NEW_REGISTRATION', 'ASSET_BARCODE', 'PROJECT', 'CODE', 'DESCRIPTION', 'COMMENTS', 'SUPPLIER', 'HOLDING_COMPANY', 'QTY', 'DISCOUNT', 'COST_EX', 'PRICE_EX', 'PRICE_INCL', 'TOTAL_INCL']
  });

  console.log(`Excel data loaded: ${excelData.length} rows`);

  // Fetch all vehicles from database
  const dbVehicles = await fetchAllVehicles();
  console.log(`Database vehicles loaded: ${dbVehicles.length}`);

  // Create normalized lookup maps
  const dbCompanyMap = new Map();
  const dbAccountMap = new Map();
  
  dbVehicles.forEach(vehicle => {
    const normalizedCompany = normalizeCompanyName(vehicle.company);
    const normalizedAccount = normalizeCompanyName(vehicle.new_account_number);
    
    if (normalizedCompany && normalizedCompany.length > 2) {
      if (!dbCompanyMap.has(normalizedCompany)) {
        dbCompanyMap.set(normalizedCompany, []);
      }
      dbCompanyMap.get(normalizedCompany).push({
        ...vehicle,
        normalizedName: normalizedCompany
      });
    }
    
    if (normalizedAccount && normalizedAccount.length > 2) {
      if (!dbAccountMap.has(normalizedAccount)) {
        dbAccountMap.set(normalizedAccount, []);
      }
      dbAccountMap.get(normalizedAccount).push({
        ...vehicle,
        normalizedAccount: normalizedAccount
      });
    }
  });

  console.log(`Normalized company lookup: ${dbCompanyMap.size} entries`);
  console.log(`Normalized account lookup: ${dbAccountMap.size} entries`);

  // Show some examples of normalization
  console.log('\nNormalization examples:');
  Array.from(dbCompanyMap.keys()).slice(0, 10).forEach(key => {
    const original = dbCompanyMap.get(key)[0].company;
    console.log(`"${original}" -> "${key}"`);
  });

  // Process Excel data and find matches
  const results = [];
  const processedAccounts = new Set();
  
  excelData.forEach((row, index) => {
    if (!row.CLIENT || !row.GROUP) return;
    
    const normalizedClient = normalizeCompanyName(row.CLIENT);
    const normalizedAccountNo = normalizeCompanyName(row.ACCOUNT_NO);
    const vehicleId = row.GROUP ? row.GROUP.toString().trim() : '';
    
    // Skip if we've already processed this account
    const accountKey = `${normalizedClient}-${normalizedAccountNo}`;
    if (processedAccounts.has(accountKey)) return;
    processedAccounts.add(accountKey);
    
    let matchedAccount = null;
    let matchType = 'NO_MATCH';
    let matchDetails = '';
    
    // Try exact company name match first
    if (normalizedClient && dbCompanyMap.has(normalizedClient)) {
      const matches = dbCompanyMap.get(normalizedClient);
      matchedAccount = matches[0].new_account_number;
      matchType = 'EXACT_COMPANY_MATCH';
      matchDetails = `Matched "${row.CLIENT}" with "${matches[0].company}"`;
    }
    // Try partial company name match (for companies with multiple divisions)
    else if (normalizedClient && normalizedClient.length > 3) {
      let bestMatch = null;
      let bestScore = 0;
      
      for (const [dbCompany, vehicles] of dbCompanyMap.entries()) {
        // Check if either contains the other (for partial matches)
        const score1 = normalizedClient.includes(dbCompany) ? dbCompany.length : 0;
        const score2 = dbCompany.includes(normalizedClient) ? normalizedClient.length : 0;
        const score = Math.max(score1, score2);
        
        if (score > bestScore && score > 3) {
          bestScore = score;
          bestMatch = vehicles[0];
        }
      }
      
      if (bestMatch) {
        matchedAccount = bestMatch.new_account_number;
        matchType = 'PARTIAL_COMPANY_MATCH';
        matchDetails = `Partial match "${row.CLIENT}" with "${bestMatch.company}"`;
      }
    }
    
    // Try account number match
    if (!matchedAccount && normalizedAccountNo && dbAccountMap.has(normalizedAccountNo)) {
      const matches = dbAccountMap.get(normalizedAccountNo);
      matchedAccount = matches[0].new_account_number;
      matchType = 'ACCOUNT_MATCH';
      matchDetails = `Account match "${row.ACCOUNT_NO}" with "${matches[0].new_account_number}"`;
    }
    
    // Generate new account number if no match found
    if (!matchedAccount) {
      matchedAccount = generateAccountNumber(row.CLIENT);
      matchType = 'GENERATED';
      matchDetails = `Generated new account for "${row.CLIENT}"`;
    }
    
    results.push({
      excelClient: row.CLIENT,
      excelAccountNo: row.ACCOUNT_NO,
      normalizedClient: normalizedClient,
      vehicleId: vehicleId,
      matchedNewAccountNumber: matchedAccount,
      matchType: matchType,
      matchDetails: matchDetails,
      serviceCode: row.CODE || '',
      serviceDescription: row.DESCRIPTION || '',
      totalAmount: parseFloat(row.TOTAL_INCL) || 0
    });
  });

  // Generate CSV
  const csvPath = path.join(__dirname, 'vehicle_account_mapping_normalized.csv');
  const csvHeaders = [
    'Excel_Client',
    'Excel_Account_No',
    'Normalized_Client',
    'Vehicle_ID',
    'Matched_New_Account_Number',
    'Match_Type',
    'Match_Details',
    'Service_Code',
    'Service_Description',
    'Total_Amount'
  ];

  let csvContent = csvHeaders.join(',') + '\n';
  
  results.forEach(result => {
    const row = [
      `"${result.excelClient}"`,
      `"${result.excelAccountNo}"`,
      `"${result.normalizedClient}"`,
      `"${result.vehicleId}"`,
      `"${result.matchedNewAccountNumber}"`,
      `"${result.matchType}"`,
      `"${result.matchDetails}"`,
      `"${result.serviceCode}"`,
      `"${result.serviceDescription}"`,
      `"${result.totalAmount.toFixed(2)}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  fs.writeFileSync(csvPath, csvContent);

  // Summary statistics
  const matchStats = {
    EXACT_COMPANY_MATCH: results.filter(r => r.matchType === 'EXACT_COMPANY_MATCH').length,
    PARTIAL_COMPANY_MATCH: results.filter(r => r.matchType === 'PARTIAL_COMPANY_MATCH').length,
    ACCOUNT_MATCH: results.filter(r => r.matchType === 'ACCOUNT_MATCH').length,
    GENERATED: results.filter(r => r.matchType === 'GENERATED').length,
    NO_MATCH: results.filter(r => r.matchType === 'NO_MATCH').length
  };

  console.log('\n========================================');
  console.log('IMPROVED MATCHING RESULTS');
  console.log('========================================\n');

  console.log(`Total unique accounts processed: ${results.length}`);
  console.log(`Exact company matches: ${matchStats.EXACT_COMPANY_MATCH}`);
  console.log(`Partial company matches: ${matchStats.PARTIAL_COMPANY_MATCH}`);
  console.log(`Account number matches: ${matchStats.ACCOUNT_MATCH}`);
  console.log(`Generated new accounts: ${matchStats.GENERATED}`);
  console.log(`No matches found: ${matchStats.NO_MATCH}`);

  const totalMatches = matchStats.EXACT_COMPANY_MATCH + matchStats.PARTIAL_COMPANY_MATCH + matchStats.ACCOUNT_MATCH;
  console.log(`\nOverall match rate: ${(totalMatches / results.length * 100).toFixed(1)}%`);

  console.log('\nTop 10 Exact Company Matches:');
  results.filter(r => r.matchType === 'EXACT_COMPANY_MATCH').slice(0, 10).forEach((result, index) => {
    console.log(`${index + 1}. ${result.matchDetails}`);
  });

  console.log('\nTop 10 Partial Company Matches:');
  results.filter(r => r.matchType === 'PARTIAL_COMPANY_MATCH').slice(0, 10).forEach((result, index) => {
    console.log(`${index + 1}. ${result.matchDetails}`);
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
  console.log(`Successful matches: ${totalMatches} (${(totalMatches / results.length * 100).toFixed(1)}%)`);
}

main().catch(console.error);