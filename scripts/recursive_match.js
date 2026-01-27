require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function recursiveMatch() {
  console.log('📊 RECURSIVE MATCHING\n');
  
  // Read Excel
  const workbook = XLSX.readFile('scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const headerRowIndex = rawData.findIndex(row => 
    row && row.includes('CLIENT') && row.includes('GROUP')
  );
  
  const headers = rawData[headerRowIndex];
  const dataRows = rawData.slice(headerRowIndex + 1);
  
  const data = dataRows
    .filter(row => row && row.length > 0)
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => { obj[header] = row[i]; });
      return obj;
    })
    .filter(row => row.CLIENT && row.GROUP && row['PRICE EX.']);
  
  // Build multiple lookup maps
  const regPrices = new Map();
  const clientPrices = new Map();
  
  data.forEach(row => {
    const group = row.GROUP;
    const client = row.CLIENT;
    const priceEx = parseFloat(row['PRICE EX.']) || 0;
    
    // Extract regs from GROUP
    const regs = group.includes('-') && group.match(/[A-Z]{2,}[0-9]+/g) 
      ? group.split('-').map(r => r.trim())
      : [group.trim()];
    
    regs.forEach(reg => {
      const regUpper = reg.toUpperCase();
      if (!regPrices.has(regUpper)) {
        regPrices.set(regUpper, priceEx);
      }
    });
    
    // Store client prices
    if (!clientPrices.has(client)) {
      clientPrices.set(client, []);
    }
    clientPrices.get(client).push(priceEx);
  });
  
  // Get vehicles with empty total_rental_sub
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, reg, fleet_number, company, total_rental_sub')
    .or('total_rental_sub.is.null,total_rental_sub.eq.0');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${vehicles.length} vehicles with empty total_rental_sub\n`);
  
  const updates = [];
  const unmatched = [];
  
  vehicles.forEach(v => {
    const reg = (v.reg || v.fleet_number || '').toUpperCase();
    let price = null;
    let matchType = '';
    
    // Strategy 1: Exact reg match
    if (regPrices.has(reg)) {
      price = regPrices.get(reg);
      matchType = 'exact';
    }
    
    // Strategy 2: Partial reg match (first 6 chars)
    if (!price && reg.length >= 6) {
      const partial = reg.substring(0, 6);
      for (const [key, val] of regPrices.entries()) {
        if (key.startsWith(partial) || partial.startsWith(key.substring(0, 6))) {
          price = val;
          matchType = 'partial';
          break;
        }
      }
    }
    
    // Strategy 3: Client average price
    if (!price && v.company) {
      const clientPriceList = clientPrices.get(v.company);
      if (clientPriceList && clientPriceList.length > 0) {
        price = clientPriceList.reduce((a, b) => a + b, 0) / clientPriceList.length;
        matchType = 'client_avg';
      }
    }
    
    // Strategy 4: Fuzzy match on reg (contains)
    if (!price) {
      for (const [key, val] of regPrices.entries()) {
        if (reg.includes(key) || key.includes(reg)) {
          price = val;
          matchType = 'fuzzy';
          break;
        }
      }
    }
    
    if (price && price > 0) {
      updates.push({
        id: v.id,
        reg: v.reg || v.fleet_number,
        client: v.company,
        price,
        matchType
      });
    } else {
      unmatched.push({
        reg: v.reg || v.fleet_number,
        client: v.company
      });
    }
  });
  
  console.log(`✅ Matched: ${updates.length}`);
  console.log(`❌ Unmatched: ${unmatched.length}\n`);
  
  // Show match type breakdown
  const matchTypes = {};
  updates.forEach(u => {
    matchTypes[u.matchType] = (matchTypes[u.matchType] || 0) + 1;
  });
  
  console.log('Match type breakdown:');
  Object.entries(matchTypes).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log('');
  
  // Show samples
  console.log('Sample matches (first 10):');
  updates.slice(0, 10).forEach(u => {
    console.log(`  ${u.reg} → R${u.price.toFixed(2)} [${u.matchType}]`);
  });
  console.log('');
  
  if (unmatched.length > 0) {
    console.log('Unmatched vehicles (first 20):');
    unmatched.slice(0, 20).forEach(u => {
      console.log(`  ${u.reg} | ${u.client || 'No client'}`);
    });
    console.log('');
  }
  
  // Update database
  if (updates.length > 0) {
    console.log('Updating database...\n');
    let updated = 0;
    
    for (const u of updates) {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ total_rental_sub: u.price })
        .eq('id', u.id);
      
      if (!updateError) updated++;
    }
    
    console.log(`✅ Updated ${updated}/${updates.length} vehicles\n`);
  }
}

recursiveMatch();
