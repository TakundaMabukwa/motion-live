const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  }
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('========================================');
  console.log('UPDATING TOTAL_SUB FOR INSERTED VEHICLES');
  console.log('========================================\n');

  const excelPath = path.join(__dirname, '20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const updates = [];
  
  for (let i = 9; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const client = row[0] || '';
    const group = row[3] || '';
    const totalIncl = parseFloat(row[17]) || 0;
    
    if ((client.includes('FAITHWHEELS') || client.includes('E.P.S. COURIER SERVICES')) && totalIncl > 0) {
      let reg = group.toUpperCase().trim();
      if (reg.includes(' - ')) {
        const parts = reg.split(' - ');
        reg = parts[parts.length - 1].trim();
      }
      reg = reg.replace(/^(TRAILER INSTALLATION|NEW TRAILER INSTALL|SKYCAM INSTALL|SKYCAM CAMERA INSTALL|RE-INSTALL|ADDITIONAL INSTALL)\s*/i, '').trim();
      
      updates.push({ reg, totalIncl });
    }
  }
  
  console.log(`📊 Found ${updates.length} vehicles to update\n`);
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  for (const item of updates) {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('vehicles')
        .select('id, reg')
        .eq('reg', item.reg)
        .single();
      
      if (fetchError || !existing) {
        notFound++;
        continue;
      }
      
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ total_sub: item.totalIncl.toString() })
        .eq('reg', item.reg);
      
      if (updateError) {
        console.error(`❌ ${item.reg}: ${updateError.message}`);
        errors++;
      } else {
        console.log(`✅ ${item.reg}: R${item.totalIncl}`);
        updated++;
      }
    } catch (err) {
      console.error(`❌ ${item.reg}: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n========================================');
  console.log('COMPLETE!');
  console.log('========================================');
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠️  Not found: ${notFound}`);
  console.log(`❌ Errors: ${errors}`);
}

main().catch(console.error);
