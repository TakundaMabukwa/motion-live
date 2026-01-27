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

function parseCSVLine(line) {
  const regex = /"([^"]*)"/g;
  const matches = [];
  let match;
  while ((match = regex.exec(line)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

async function addEdgeVehicles() {
  const { data: supabaseData } = await supabase
    .from('vehicles')
    .select('company, new_account_number, fleet_number')
    .ilike('new_account_number', '%EDGE%');

  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('fleet_number');

  const dbCompanies = new Map();
  const existingFleets = new Set();
  
  supabaseData.forEach(item => {
    const normalized = normalize(item.company || '');
    if (!dbCompanies.has(normalized)) {
      dbCompanies.set(normalized, item.new_account_number);
    }
  });

  allVehicles.forEach(item => {
    if (item.fleet_number) {
      existingFleets.add(item.fleet_number.trim().toUpperCase());
    }
  });

  console.log(`Total EDGE companies in DB: ${dbCompanies.size}`);
  console.log(`Total vehicles in DB: ${existingFleets.size}\n`);

  const edgeNumbers = [...new Set(supabaseData.map(i => i.new_account_number))]
    .filter(n => n && n.match(/EDGE-(\d+)/))
    .map(n => parseInt(n.match(/EDGE-(\d+)/)[1]));
  
  let nextNumber = Math.max(...edgeNumbers) + 1;

  const csv = fs.readFileSync('./scripts/vehicles_not_in_db.csv', 'utf-8');
  const lines = csv.split('\n');
  
  const toInsert = [];
  
  lines.forEach(line => {
    if (!line.includes('EDGE')) return;
    
    const fields = parseCSVLine(line);
    if (fields.length < 16) return;
    
    const company = fields[0]?.trim();
    if (!company || !company.startsWith('EDGE')) return;
    
    const accountNumber = fields[1]?.trim();
    const fleetNumber = fields[2]?.trim();
    const reg = fields[3]?.trim();
    const vin = fields[6]?.trim();
    const totalIncl = parseFloat(fields[fields.length - 1]) || 0;
    
    // Use fleet_number, or reg, or vin as identifier
    const identifier = fleetNumber || reg || vin;
    if (!identifier) return;
    if (existingFleets.has(identifier.toUpperCase())) return;
    
    const normalized = normalize(company);
    let newAccountNumber = dbCompanies.get(normalized);
    
    if (!newAccountNumber) {
      newAccountNumber = `EDGE-${String(nextNumber).padStart(4, '0')}`;
      dbCompanies.set(normalized, newAccountNumber);
      nextNumber++;
    }
    
    toInsert.push({
      company,
      new_account_number: newAccountNumber,
      account_number: accountNumber,
      fleet_number: identifier,
      reg: reg,
      vin: vin,
      total_sub: totalIncl
    });
  });

  console.log(`Total vehicles to insert: ${toInsert.length}\n`);
  
  const summary = new Map();
  toInsert.forEach(v => {
    if (!summary.has(v.new_account_number)) {
      summary.set(v.new_account_number, { company: v.company, count: 0 });
    }
    summary.get(v.new_account_number).count++;
  });
  
  console.log('Summary by Account:');
  console.log('='.repeat(80));
  [...summary.entries()].sort().forEach(([acc, data]) => {
    console.log(`${acc} | ${data.company} | ${data.count} vehicles`);
  });

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

addEdgeVehicles();
