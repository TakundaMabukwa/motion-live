require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePricesFromExcel() {
  console.log('📊 UPDATING PRICES FROM EXCEL\n');
  console.log('='.repeat(80));
  
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
  
  console.log(`Found ${data.length} rows in Excel\n`);
  
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
  
  console.log(`Mapped ${regPrices.size} unique regs to prices\n`);
  
  // Get vehicles with empty total_rental_sub
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, reg, fleet_number, total_rental_sub')
    .or('total_rental_sub.is.null,total_rental_sub.eq.0');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${vehicles.length} vehicles with empty total_rental_sub\n`);
  
  // Match and prepare updates
  const updates = [];
  
  vehicles.forEach(v => {
    const reg = (v.reg || v.fleet_number || '').toUpperCase();
    const price = regPrices.get(reg);
    
    if (price && price > 0) {
      updates.push({
        id: v.id,
        reg: v.reg || v.fleet_number,
        oldPrice: v.total_rental_sub || 0,
        newPrice: price
      });
    }
  });
  
  console.log(`Matched ${updates.length} vehicles to update\n`);
  
  if (updates.length === 0) {
    console.log('No updates needed!\n');
    return;
  }
  
  // Show sample
  console.log('Sample updates (first 10):');
  updates.slice(0, 10).forEach(u => {
    console.log(`  ID ${u.id}: ${u.reg} | ${u.oldPrice} → ${u.newPrice}`);
  });
  console.log('');
  
  // Update in batches
  let updated = 0;
  const batchSize = 100;
  
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    for (const u of batch) {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ total_rental_sub: u.newPrice })
        .eq('id', u.id);
      
      if (updateError) {
        console.error(`Error updating ID ${u.id}:`, updateError);
      } else {
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated}/${updates.length}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ COMPLETE: Updated ${updated} vehicles\n`);
}

updatePricesFromExcel();
