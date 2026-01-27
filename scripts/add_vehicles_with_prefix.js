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

function getCompanyPrefix(company) {
  // Special cases
  if (company.toUpperCase().includes('MACSTEEL') || company.toUpperCase().includes('VRN')) {
    return 'MACS';
  }
  
  const words = company.toUpperCase().split(/[\s-]+/);
  let prefix = '';
  for (const word of words) {
    if (word.length > 0 && /[A-Z]/.test(word[0])) {
      prefix += word[0];
      if (prefix.length >= 4) break;
    }
  }
  return prefix.substring(0, 4) || 'COMP';
}

async function addMissingVehiclesCorrectly() {
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('company, new_account_number, account_number, fleet_number, reg');

  const existingVehicles = new Set();
  const companyToAccount = new Map();
  const accountPrefixCounters = new Map();
  
  allVehicles.forEach(item => {
    if (item.fleet_number) existingVehicles.add(normalize(item.fleet_number));
    if (item.reg) existingVehicles.add(normalize(item.reg));
    
    if (item.company && item.new_account_number) {
      const normCompany = normalizeCompany(item.company);
      if (!companyToAccount.has(normCompany)) {
        companyToAccount.set(normCompany, item.new_account_number);
      }
      
      // Track highest number for each prefix
      const match = item.new_account_number.match(/^([A-Z]+)-(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2]);
        if (!accountPrefixCounters.has(prefix) || accountPrefixCounters.get(prefix) < num) {
          accountPrefixCounters.set(prefix, num);
        }
      }
    }
  });

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
      if (existingVehicles.has(normalizedGroup)) found = true;
      else if (group.includes('-')) {
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
      if (existingVehicles.has(normalizedReg)) found = true;
      else if (newReg.includes('-')) {
        const parts = newReg.split('-');
        for (const part of parts) {
          if (part.trim() && existingVehicles.has(normalize(part))) {
            found = true;
            break;
          }
        }
      }
    }
    
    if (found) return;
    
    // Determine new_account_number
    let newAccountNumber;
    const normCompany = normalizeCompany(company);
    
    if (companyToAccount.has(normCompany)) {
      // Company exists - use existing account number
      newAccountNumber = companyToAccount.get(normCompany);
    } else {
      // New company - create account number with prefix
      const prefix = getCompanyPrefix(company);
      const currentNum = accountPrefixCounters.get(prefix) || 0;
      const nextNum = currentNum + 1;
      newAccountNumber = `${prefix}-${String(nextNum).padStart(4, '0')}`;
      
      companyToAccount.set(normCompany, newAccountNumber);
      accountPrefixCounters.set(prefix, nextNum);
      newCompanies.push({ company, account: newAccountNumber, prefix });
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
  console.log(`New companies: ${newCompanies.length}\n`);
  
  if (newCompanies.length > 0) {
    console.log('New companies (first 20):');
    console.log('='.repeat(80));
    newCompanies.slice(0, 20).forEach(c => {
      console.log(`${c.company} → ${c.account} (prefix: ${c.prefix})`);
    });
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

addMissingVehiclesCorrectly();
