require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertVehiclesFromExcel() {
  console.log('🚀 INSERTING VEHICLES FROM EXCEL\n');
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
    .filter(row => row.CLIENT && row.GROUP);
  
  // Get existing data
  const { data: vehicles } = await supabase.from('vehicles').select('company, new_account_number, reg');
  const { data: edgeAccounts } = await supabase.from('vehicles').select('new_account_number').ilike('new_account_number', 'EDGE-%').order('new_account_number', { ascending: false });
  
  const existingRegs = new Set(vehicles.map(v => v.reg?.toUpperCase().replace(/\s+/g, '')));
  const companiesInDB = new Map();
  vehicles.forEach(v => companiesInDB.set(v.company.toUpperCase(), v.new_account_number));
  
  let nextEdge = edgeAccounts && edgeAccounts.length > 0 ? parseInt(edgeAccounts[0].new_account_number.split('-')[1]) + 1 : 44;
  const clientToAccount = new Map();
  
  // Prepare inserts
  const toInsert = [];
  
  data.forEach(row => {
    const client = row.CLIENT;
    const group = row.GROUP;
    
    const regs = group.includes('-') && group.match(/[A-Z]{2,}[0-9]+/g) 
      ? group.split('-').map(r => r.trim())
      : [group.trim()];
    
    regs.forEach(reg => {
      if (existingRegs.has(reg.toUpperCase().replace(/\s+/g, ''))) return;
      
      let accountNumber = companiesInDB.get(client.toUpperCase());
      
      if (!accountNumber) {
        if (!clientToAccount.has(client)) {
          accountNumber = `EDGE-${String(nextEdge).padStart(4, '0')}`;
          clientToAccount.set(client, accountNumber);
          nextEdge++;
        } else {
          accountNumber = clientToAccount.get(client);
        }
      }
      
      toInsert.push({
        reg: reg,
        company: client,
        new_account_number: accountNumber,
        account_number: accountNumber
      });
    });
  });
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total to insert: ${toInsert.length} vehicles`);
  console.log(`   New EDGE accounts: ${clientToAccount.size}`);
  console.log(`   Next EDGE: EDGE-${String(nextEdge).padStart(4, '0')}\n`);
  
  // Insert in batches
  const batchSize = 500;
  let inserted = 0;
  
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('vehicles').insert(batch);
    
    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      break;
    }
    
    inserted += batch.length;
    console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: Inserted ${batch.length} vehicles (Total: ${inserted}/${toInsert.length})`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ COMPLETE: Inserted ${inserted} vehicles\n`);
}

insertVehiclesFromExcel();
