require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
);

function parseCSVLine(line) {
  const regex = /"([^"]*)"/g;
  const matches = [];
  let match;
  while ((match = regex.exec(line)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function normalize(str) {
  return str.toUpperCase().replace(/[\s-]/g, '');
}

function normalizeCompany(str) {
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function addMissingVehicles() {
  const { data: edgeVehicles } = await supabase
    .from('vehicles')
    .select('company, new_account_number')
    .ilike('new_account_number', '%EDGE%');

  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('fleet_number, reg');

  const dbCompanies = new Map();
  const existingVehicles = new Set();
  
  edgeVehicles.forEach(item => {
    const normalized = normalizeCompany(item.company || '');
    if (!dbCompanies.has(normalized)) {
      dbCompanies.set(normalized, item.new_account_number);
    }
  });

  allVehicles.forEach(item => {
    if (item.fleet_number) existingVehicles.add(normalize(item.fleet_number));
    if (item.reg) existingVehicles.add(normalize(item.reg));
  });

  const edgeNumbers = [...new Set(edgeVehicles.map(i => i.new_account_number))]
    .filter(n => n && n.match(/EDGE-(\d+)/))
    .map(n => parseInt(n.match(/EDGE-(\d+)/)[1]));
  
  let nextNumber = Math.max(...edgeNumbers) + 1;

  const csv = fs.readFileSync('./scripts/vehicles_not_in_db.csv', 'utf-8');
  const lines = csv.split('\n');
  
  const toInsert = [];
  
  lines.forEach((line, idx) => {
    if (idx === 0) return;
    if (!line.trim()) return;
    
    const fields = parseCSVLine(line);
    if (fields.length < 4) return;
    
    const company = fields[0]?.trim();
    const accountNumber = fields[1]?.trim();
    const groupColumn = fields[3]?.trim();
    const totalIncl = parseFloat(fields[fields.length - 1]) || 0;
    
    if (!groupColumn) return;
    
    const normalizedGroup = normalize(groupColumn);
    const parts = groupColumn.split('-');
    
    // EXACT SAME CHECK AS check_missing_vehicles.js
    let found = false;
    if (existingVehicles.has(normalizedGroup)) {
      found = true;
    } else {
      for (const part of parts) {
        if (part.trim() && existingVehicles.has(normalize(part))) {
          found = true;
          break;
        }
      }
    }
    
    if (found) return; // Skip if exists
    
    // Determine account number
    let newAccountNumber;
    if (company && company.startsWith('EDGE')) {
      const normalized = normalizeCompany(company);
      newAccountNumber = dbCompanies.get(normalized);
      
      if (!newAccountNumber) {
        newAccountNumber = `EDGE-${String(nextNumber).padStart(4, '0')}`;
        dbCompanies.set(normalized, newAccountNumber);
        nextNumber++;
      }
    } else {
      newAccountNumber = accountNumber;
    }
    
    let fleetNumber = '';
    let reg = '';
    
    if (parts.length >= 2) {
      fleetNumber = parts[0].trim();
      reg = parts[1].trim();
    } else {
      reg = groupColumn;
    }
    
    toInsert.push({
      company: company || null,
      new_account_number: newAccountNumber || null,
      account_number: accountNumber || null,
      fleet_number: fleetNumber || null,
      reg: reg || null,
      total_sub: totalIncl
    });
  });

  console.log(`Total vehicles to insert: ${toInsert.length}\n`);
  
  const summary = new Map();
  toInsert.forEach(v => {
    const key = v.new_account_number || 'NO_ACCOUNT';
    if (!summary.has(key)) {
      summary.set(key, { company: v.company, count: 0 });
    }
    summary.get(key).count++;
  });
  
  console.log('Summary by Account (first 30):');
  console.log('='.repeat(80));
  let count = 0;
  [...summary.entries()].sort().forEach(([acc, data]) => {
    if (count++ < 30) {
      console.log(`${acc} | ${data.company} | ${data.count} vehicles`);
    }
  });

  console.log(`\n\nProceeding with insert...`);

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

addMissingVehicles();
