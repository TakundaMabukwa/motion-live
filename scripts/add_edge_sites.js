require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
);

function normalize(str) {
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function addEdgeSitesAndVehicles() {
  // Get existing EDGE accounts
  const { data: supabaseData } = await supabase
    .from('vehicles')
    .select('company, new_account_number')
    .ilike('new_account_number', '%EDGE%');

  const existingCompanies = [...new Map(supabaseData.map(item => [
    item.company?.toString().trim().toUpperCase(), item
  ])).values()];
  const existingNormalized = new Map(existingCompanies.map(c => [
    normalize(c.company?.toString().trim() || ''), c.new_account_number
  ]));
  
  const edgeNumbers = existingCompanies
    .map(c => c.new_account_number)
    .filter(n => n && n.match(/EDGE-(\d+)/))
    .map(n => parseInt(n.match(/EDGE-(\d+)/)[1]));
  
  let nextNumber = Math.max(...edgeNumbers) + 1;

  // Read Excel
  const workbook = XLSX.readFile('./scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const excelData = [];
  data.forEach((row, index) => {
    if (index === 0) return;
    const company = row[0]?.toString().trim();
    const accountNumber = row[1]?.toString().trim();
    const fleetNumber = row[2]?.toString().trim();
    const totalIncl = parseFloat(row[row.length - 1]) || 0;
    
    if (company && accountNumber && accountNumber.includes('EDGE')) {
      excelData.push({ company, accountNumber, fleetNumber, totalIncl });
    }
  });

  // Group by company
  const companyMap = new Map();
  excelData.forEach(item => {
    const normalized = normalize(item.company);
    if (!companyMap.has(normalized)) {
      companyMap.set(normalized, { company: item.company, vehicles: [] });
    }
    companyMap.get(normalized).vehicles.push(item);
  });

  const toInsert = [];
  const newSites = [];

  companyMap.forEach((data, normalized) => {
    let accountNum = existingNormalized.get(normalized);
    
    if (!accountNum) {
      accountNum = `EDGE-${String(nextNumber).padStart(4, '0')}`;
      newSites.push({ company: data.company, accountNum });
      nextNumber++;
    }

    data.vehicles.forEach(v => {
      toInsert.push({
        company: data.company,
        new_account_number: accountNum,
        account_number: v.accountNumber,
        fleet_number: v.fleetNumber,
        total_sub: v.totalIncl
      });
    });
  });

  console.log('NEW SITES TO ADD:');
  console.log('='.repeat(80));
  newSites.forEach(s => console.log(`${s.company} | ${s.accountNum}`));
  
  console.log(`\n\nVEHICLES TO INSERT: ${toInsert.length}`);
  console.log('\nFirst 10 vehicles:');
  toInsert.slice(0, 10).forEach(v => {
    console.log(`${v.company} | ${v.new_account_number} | ${v.fleet_number} | R${v.total_sub}`);
  });
  
  console.log('\n\nLast 10 vehicles:');
  toInsert.slice(-10).forEach(v => {
    console.log(`${v.company} | ${v.new_account_number} | ${v.fleet_number} | R${v.total_sub}`);
  });

  console.log('\n\nSummary by Account:');
  const summary = new Map();
  toInsert.forEach(v => {
    if (!summary.has(v.new_account_number)) {
      summary.set(v.new_account_number, { company: v.company, count: 0 });
    }
    summary.get(v.new_account_number).count++;
  });
  [...summary.entries()].sort().forEach(([acc, data]) => {
    console.log(`${acc} | ${data.company} | ${data.count} vehicles`);
  });

  console.log('\n\n⚠️  DRY RUN - No data inserted.');
}

addEdgeSitesAndVehicles();
