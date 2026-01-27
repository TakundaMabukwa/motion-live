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

async function compareAndAdd() {
  const { data: supabaseData, error } = await supabase
    .from('vehicles')
    .select('company, new_account_number')
    .ilike('new_account_number', '%EDGE%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const existingCompanies = [...new Map(supabaseData.map(item => [item.company?.toUpperCase().trim(), item])).values()];
  const existingNormalized = new Map(existingCompanies.map(c => [normalize(c.company || ''), c.company]));
  
  const edgeNumbers = existingCompanies
    .map(c => c.new_account_number)
    .filter(n => n && n.match(/EDGE-(\d+)/))
    .map(n => parseInt(n.match(/EDGE-(\d+)/)[1]));
  
  let nextNumber = Math.max(...edgeNumbers) + 1;

  const workbook = XLSX.readFile('./scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const excelCompanies = new Map();
  data.forEach((row, index) => {
    if (index === 0) return;
    const company = row[0];
    const accountNumber = row[1];
    
    if (company && accountNumber && accountNumber.toString().includes('EDGE')) {
      const normalized = normalize(company);
      if (!excelCompanies.has(normalized)) {
        excelCompanies.set(normalized, company);
      }
    }
  });

  const missing = [];
  const matched = [];
  
  excelCompanies.forEach((excelName, normalized) => {
    if (existingNormalized.has(normalized)) {
      matched.push({ excel: excelName, supabase: existingNormalized.get(normalized) });
    } else {
      missing.push(excelName);
    }
  });

  console.log('MATCHED COMPANIES:');
  console.log('='.repeat(80));
  matched.forEach(m => {
    console.log(`Excel: ${m.excel}`);
    console.log(`Supabase: ${m.supabase}`);
    console.log('---');
  });

  console.log('\n\nMISSING COMPANIES TO ADD:');
  console.log('='.repeat(80));
  
  missing.forEach(company => {
    const newAccNumber = `EDGE-${String(nextNumber).padStart(4, '0')}`;
    console.log(`${company} | ${newAccNumber}`);
    nextNumber++;
  });

  console.log(`\nTotal matched: ${matched.length}`);
  console.log(`Total missing: ${missing.length}`);
  console.log(`Next available: EDGE-${String(nextNumber).padStart(4, '0')}`);
}

compareAndAdd();
