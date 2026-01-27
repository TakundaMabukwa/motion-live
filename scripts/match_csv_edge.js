require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
);

function normalize(str) {
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function matchEdgeCompanies() {
  // Get existing EDGE accounts from DB
  const { data: supabaseData } = await supabase
    .from('vehicles')
    .select('company, new_account_number')
    .ilike('new_account_number', '%EDGE%');

  const dbCompanies = new Map();
  supabaseData.forEach(item => {
    const normalized = normalize(item.company || '');
    if (!dbCompanies.has(normalized)) {
      dbCompanies.set(normalized, {
        company: item.company,
        account: item.new_account_number
      });
    }
  });

  const edgeNumbers = [...new Set(supabaseData.map(i => i.new_account_number))]
    .filter(n => n && n.match(/EDGE-(\d+)/))
    .map(n => parseInt(n.match(/EDGE-(\d+)/)[1]));
  
  let nextNumber = Math.max(...edgeNumbers) + 1;

  // Read CSV
  const csv = fs.readFileSync('./scripts/vehicles_not_in_db.csv', 'utf-8');
  const lines = csv.split('\n');
  
  const csvCompanies = new Set();
  lines.forEach(line => {
    const match = line.match(/^"(EDGE[^"]+)"/);
    if (match) {
      csvCompanies.add(match[1].trim());
    }
  });

  const matched = [];
  const missing = [];

  csvCompanies.forEach(csvCompany => {
    const normalized = normalize(csvCompany);
    if (dbCompanies.has(normalized)) {
      const db = dbCompanies.get(normalized);
      matched.push({
        csv: csvCompany,
        db: db.company,
        account: db.account
      });
    } else {
      missing.push({
        csv: csvCompany,
        newAccount: `EDGE-${String(nextNumber).padStart(4, '0')}`
      });
      nextNumber++;
    }
  });

  console.log('MATCHED COMPANIES:');
  console.log('='.repeat(80));
  matched.forEach(m => {
    console.log(`CSV: ${m.csv}`);
    console.log(`DB:  ${m.db}`);
    console.log(`Account: ${m.account}`);
    console.log('---');
  });

  console.log('\n\nMISSING COMPANIES TO ADD:');
  console.log('='.repeat(80));
  missing.forEach(m => {
    console.log(`${m.csv} → ${m.newAccount}`);
  });

  console.log(`\n\nTotal matched: ${matched.length}`);
  console.log(`Total missing: ${missing.length}`);
}

matchEdgeCompanies();
