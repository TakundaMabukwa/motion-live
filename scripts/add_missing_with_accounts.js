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

function normalizeCompany(str) {
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function addMissingVehiclesWithAccounts() {
  // Get all existing vehicles
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('company, new_account_number, account_number, fleet_number, reg');

  // Build maps
  const existingVehicles = new Set();
  const companyToAccount = new Map();
  const accountToCompany = new Map();
  
  allVehicles.forEach(item => {
    if (item.fleet_number) existingVehicles.add(normalize(item.fleet_number));
    if (item.reg) existingVehicles.add(normalize(item.reg));
    
    // Map company to new_account_number
    if (item.company && item.new_account_number) {
      const normCompany = normalizeCompany(item.company);
      if (!companyToAccount.has(normCompany)) {
        companyToAccount.set(normCompany, item.new_account_number);
        accountToCompany.set(item.new_account_number, item.company);
      }
    }
  });

  // Get highest EDGE number for new companies
  const edgeNumbers = [...accountToCompany.keys()]
    .filter(n => n && n.match(/EDGE-(\d+)/))
    .map(n => parseInt(n.match(/EDGE-(\d+)/)[1]));
  let nextEdgeNumber = edgeNumbers.length > 0 ? Math.max(...edgeNumbers) + 1 : 1;

  // Read Excel
  const workbook = XLSX.readFile('./scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const toInsert = [];
  const newCompanies = [];

  data.forEach((row, index) => {
    if (index < 9) return;
    
    const company = row[0]?.toString().trim();
    const accountNumber = row[1]?.toString().trim();
    const group = row[3]?.toString().trim();
    const newReg = row[4]?.toString().trim();
    const excelPrice = parseFloat(row[row.length - 1]) || 0;
    
    if (!company || (!group && !newReg)) return;
    
    // Check if vehicle exists
    let found = false;
    if (group) {
      const normalizedGroup = normalize(group);
      if (existingVehicles.has(normalizedGroup)) {
        found = true;
      } else if (group.includes('-')) {
        const parts = group.split('-');
        for (const part of parts) {
          if (part.trim() && existingVehicles.has(normalize(part))) {
            found = true;
            break;
          }
        }
      }
    }
    if (!found && newReg) {
      const normalizedReg = normalize(newReg);
      if (existingVehicles.has(normalizedReg)) {
        found = true;
      } else if (newReg.includes('-')) {
        const parts = newReg.split('-');
        for (const part of parts) {
          if (part.trim() && existingVehicles.has(normalize(part))) {
            found = true;
            break;
          }
        }
      }
    }
    
    if (found) return; // Skip existing vehicles
    
    // Determine new_account_number
    let newAccountNumber;
    const normCompany = normalizeCompany(company);
    
    if (company.startsWith('EDGE')) {
      // EDGE company
      newAccountNumber = companyToAccount.get(normCompany);
      if (!newAccountNumber) {
        newAccountNumber = `EDGE-${String(nextEdgeNumber).padStart(4, '0')}`;
        companyToAccount.set(normCompany, newAccountNumber);
        newCompanies.push({ company, account: newAccountNumber });
        nextEdgeNumber++;
      }
    } else {
      // Non-EDGE company - use account_number from Excel as new_account_number
      newAccountNumber = companyToAccount.get(normCompany);
      if (!newAccountNumber) {
        newAccountNumber = accountNumber;
        companyToAccount.set(normCompany, newAccountNumber);
      }
    }
    
    // Parse group for fleet_number and reg
    let fleetNumber = '';
    let reg = '';
    if (group && group.includes('-')) {
      const parts = group.split('-');
      fleetNumber = parts[0].trim();
      reg = parts[1].trim();
    } else {
      reg = group || newReg;
    }
    
    toInsert.push({
      company,
      new_account_number: newAccountNumber,
      account_number: accountNumber,
      fleet_number: fleetNumber || null,
      reg: reg || null,
      total_sub: excelPrice
    });
  });

  console.log(`Total vehicles to insert: ${toInsert.length}`);
  console.log(`New companies to create: ${newCompanies.length}\n`);
  
  if (newCompanies.length > 0) {
    console.log('New companies:');
    console.log('='.repeat(80));
    newCompanies.forEach(c => console.log(`${c.company} → ${c.account}`));
  }
  
  const summary = new Map();
  toInsert.forEach(v => {
    const key = v.new_account_number || 'NO_ACCOUNT';
    if (!summary.has(key)) {
      summary.set(key, { company: v.company, count: 0 });
    }
    summary.get(key).count++;
  });
  
  console.log('\n\nSummary by Account (top 30):');
  console.log('='.repeat(80));
  let count = 0;
  [...summary.entries()].sort((a, b) => b[1].count - a[1].count).forEach(([acc, data]) => {
    if (count++ < 30) {
      console.log(`${acc} | ${data.company} | ${data.count} vehicles`);
    }
  });

  console.log('\n\nProceeding with insert...');

  const { data: inserted, error } = await supabase
    .from('vehicles')
    .insert(toInsert)
    .select();

  if (error) {
    console.error('\nError:', error);
    return;
  }

  console.log(`\n✅ Inserted ${inserted.length} vehicles`);
}

addMissingVehiclesWithAccounts();
