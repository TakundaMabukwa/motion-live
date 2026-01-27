require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUpdateCount() {
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
  
  // Build reg to price map
  const regPrices = new Map();
  
  data.forEach(row => {
    const group = row.GROUP;
    const priceEx = parseFloat(row['PRICE EX.']) || 0;
    
    const regs = group.includes('-') && group.match(/[A-Z]{2,}[0-9]+/g) 
      ? group.split('-').map(r => r.trim())
      : [group.trim()];
    
    regs.forEach(reg => {
      const regUpper = reg.toUpperCase();
      if (!regPrices.has(regUpper)) {
        regPrices.set(regUpper, priceEx);
      }
    });
  });
  
  // Get vehicles with empty total_rental_sub
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, reg, fleet_number, total_rental_sub')
    .or('total_rental_sub.is.null,total_rental_sub.eq.0');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Match vehicles
  const matches = [];
  
  vehicles.forEach(v => {
    const reg = (v.reg || v.fleet_number || '').toUpperCase();
    const price = regPrices.get(reg);
    
    if (price && price > 0) {
      matches.push({
        reg: v.reg || v.fleet_number,
        price
      });
    }
  });
  
  console.log(`\n📊 UPDATE SUMMARY\n${'='.repeat(50)}`);
  console.log(`Total vehicles with empty total_rental_sub: ${vehicles.length}`);
  console.log(`Vehicles that will be updated: ${matches.length}`);
  console.log(`Vehicles without match: ${vehicles.length - matches.length}\n`);
  
  if (matches.length > 0) {
    console.log('Sample vehicles to update (first 20):');
    matches.slice(0, 20).forEach(m => {
      console.log(`  ${m.reg} → R${m.price.toFixed(2)}`);
    });
  }
  
  console.log(`\n${'='.repeat(50)}\n`);
}

checkUpdateCount();
