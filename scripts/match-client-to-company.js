const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

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
  console.log('MATCHING CLIENT TO COMPANY');
  console.log('========================================\n');

  // Read the vehicles_not_in_db.csv
  const csvPath = path.join(__dirname, 'vehicles_not_in_db.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');
  
  console.log(`📄 Reading ${lines.length - 1} records from CSV\n`);
  
  // Fetch all vehicles with company and new_account_number
  console.log('📊 Fetching all vehicles from DB...');
  let allVehicles = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('company, new_account_number, reg, fleet_number')
      .not('company', 'is', null)
      .not('new_account_number', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('Error:', error.message);
      break;
    }
    
    if (!vehicles || vehicles.length === 0) break;
    
    allVehicles = allVehicles.concat(vehicles);
    console.log(`  Fetched page ${page + 1}: ${vehicles.length} vehicles (total: ${allVehicles.length})`);
    
    if (vehicles.length < pageSize) break;
    page++;
  }
  
  console.log(`\n✅ Total vehicles with company: ${allVehicles.length}\n`);
  
  // Create company lookup map (case-insensitive)
  const companyMap = new Map();
  allVehicles.forEach(vehicle => {
    const companyKey = vehicle.company.toUpperCase().trim();
    if (!companyMap.has(companyKey)) {
      companyMap.set(companyKey, []);
    }
    companyMap.get(companyKey).push(vehicle);
  });
  
  console.log(`📊 Unique companies in DB: ${companyMap.size}\n`);
  console.log('🔍 Matching CLIENT to COMPANY...\n');
  
  const matched = [];
  const notMatched = [];
  
  // Process each CSV line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV (handle quoted fields)
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);
    
    const client = fields[0] || '';
    const clientKey = client.toUpperCase().trim();
    
    // Try to find match
    const matchedVehicles = companyMap.get(clientKey);
    
    if (matchedVehicles && matchedVehicles.length > 0) {
      // Use the first match's new_account_number
      const newAccountNumber = matchedVehicles[0].new_account_number;
      matched.push({
        client,
        newAccountNumber,
        matchCount: matchedVehicles.length,
        fullRow: fields
      });
    } else {
      notMatched.push({
        client,
        fullRow: fields
      });
    }
  }
  
  console.log(`✅ Matched: ${matched.length}`);
  console.log(`❌ Not matched: ${notMatched.length}\n`);
  
  // Generate output CSV with new_account_number
  const outputLines = [];
  outputLines.push('NEW_ACCOUNT_NUMBER,MATCH_COUNT,' + headers.join(','));
  
  matched.forEach(item => {
    const row = [
      `"${item.newAccountNumber}"`,
      item.matchCount,
      ...item.fullRow.map(f => `"${f}"`)
    ].join(',');
    outputLines.push(row);
  });
  
  const outputPath = path.join(__dirname, 'vehicles_with_matched_accounts.csv');
  fs.writeFileSync(outputPath, outputLines.join('\n'));
  
  console.log(`✅ Output saved to: ${outputPath}`);
  console.log(`📊 Total records with matched accounts: ${matched.length}\n`);
  
  // Also save not matched for reference
  const notMatchedLines = [];
  notMatchedLines.push(headers.join(','));
  notMatched.forEach(item => {
    notMatchedLines.push(item.fullRow.map(f => `"${f}"`).join(','));
  });
  
  const notMatchedPath = path.join(__dirname, 'vehicles_no_company_match.csv');
  fs.writeFileSync(notMatchedPath, notMatchedLines.join('\n'));
  
  console.log(`📄 Not matched saved to: ${notMatchedPath}`);
  console.log(`📊 Total records without company match: ${notMatched.length}\n`);
  
  console.log('========================================');
  console.log('COMPLETE!');
  console.log('========================================');
}

main().catch(console.error);
