require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scanExcelData() {
  console.log('📊 SCANNING EXCEL FILE\n');
  console.log('='.repeat(80));
  
  // Read Excel file
  const workbook = XLSX.readFile('scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Find header row (contains 'CLIENT', 'GROUP', etc.)
  const headerRowIndex = rawData.findIndex(row => 
    row && row.includes('CLIENT') && row.includes('GROUP')
  );
  
  if (headerRowIndex === -1) {
    console.error('❌ Could not find header row with CLIENT and GROUP columns');
    return;
  }
  
  const headers = rawData[headerRowIndex];
  const dataRows = rawData.slice(headerRowIndex + 1);
  
  // Convert to objects
  const data = dataRows
    .filter(row => row && row.length > 0)
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    })
    .filter(row => row.CLIENT && row.GROUP);
  
  console.log(`\n📋 Excel Info:`);
  console.log(`   Total rows: ${data.length}`);
  console.log(`   Columns: ${Object.keys(data[0] || {}).join(', ')}\n`);
  
  // Get existing companies and EDGE accounts from DB
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('company, new_account_number, reg')
    .not('company', 'is', null);
  
  const existingCompanies = new Set(vehicles.map(v => v.company?.toUpperCase()));
  const existingRegs = new Set(vehicles.map(v => v.reg?.toUpperCase()));
  
  const { data: edgeAccounts } = await supabase
    .from('vehicles')
    .select('new_account_number')
    .ilike('new_account_number', 'EDGE-%')
    .order('new_account_number', { ascending: false });
  
  const lastEdgeNumber = edgeAccounts && edgeAccounts.length > 0 
    ? parseInt(edgeAccounts[0].new_account_number.split('-')[1]) 
    : 0;
  
  console.log(`📊 Database Info:`);
  console.log(`   Existing companies: ${existingCompanies.size}`);
  console.log(`   Existing regs: ${existingRegs.size}`);
  console.log(`   Last EDGE account: EDGE-${String(lastEdgeNumber).padStart(4, '0')}\n`);
  
  // Analyze Excel data
  const analysis = {
    totalRegs: 0,
    splitRegs: 0,
    existingClients: 0,
    newClients: 0,
    existingRegs: 0,
    newRegs: 0,
    clients: new Map(),
    regs: []
  };
  
  data.forEach((row, idx) => {
    const client = row.CLIENT;
    const group = row.GROUP;
    const accountNo = row['ACCOUNT NO.'];
    
    if (!client || !group) return;
    
    // Split regs if they contain dash (e.g., VDV2206-CF181865)
    const regs = group.includes('-') && group.match(/[A-Z]{2,}[0-9]+/g) 
      ? group.split('-').map(r => r.trim())
      : [group.trim()];
    
    if (regs.length > 1) analysis.splitRegs++;
    
    regs.forEach(reg => {
      analysis.totalRegs++;
      
      const clientUpper = client.toUpperCase();
      const regUpper = reg.toUpperCase();
      
      // Track client
      if (!analysis.clients.has(clientUpper)) {
        analysis.clients.set(clientUpper, {
          name: client,
          exists: existingCompanies.has(clientUpper),
          regs: []
        });
      }
      analysis.clients.get(clientUpper).regs.push(reg);
      
      // Track reg
      const regExists = existingRegs.has(regUpper);
      if (regExists) analysis.existingRegs++;
      else analysis.newRegs++;
      
      analysis.regs.push({
        client,
        reg,
        exists: regExists,
        rowIndex: idx + 2
      });
    });
  });
  
  analysis.existingClients = Array.from(analysis.clients.values()).filter(c => c.exists).length;
  analysis.newClients = analysis.clients.size - analysis.existingClients;
  
  console.log('='.repeat(80));
  console.log('\n📊 ANALYSIS SUMMARY:\n');
  console.log(`   Total registrations: ${analysis.totalRegs}`);
  console.log(`   Split registrations (dash): ${analysis.splitRegs}`);
  console.log(`   Existing regs in DB: ${analysis.existingRegs}`);
  console.log(`   New regs to insert: ${analysis.newRegs}\n`);
  console.log(`   Total clients: ${analysis.clients.size}`);
  console.log(`   Existing clients: ${analysis.existingClients}`);
  console.log(`   New clients (need EDGE-XXXX): ${analysis.newClients}\n`);
  
  // Show new clients
  console.log('='.repeat(80));
  console.log('\n🆕 NEW CLIENTS (will get EDGE-XXXX accounts):\n');
  let nextEdge = lastEdgeNumber + 1;
  Array.from(analysis.clients.entries())
    .filter(([_, info]) => !info.exists)
    .forEach(([client, info]) => {
      const newAccount = `EDGE-${String(nextEdge).padStart(4, '0')}`;
      console.log(`   ${client} → ${newAccount} (${info.regs.length} vehicles)`);
      nextEdge++;
    });
  
  // Show existing clients
  console.log('\n✅ EXISTING CLIENTS (will use existing company name):\n');
  Array.from(analysis.clients.entries())
    .filter(([_, info]) => info.exists)
    .slice(0, 10)
    .forEach(([client, info]) => {
      console.log(`   ${client} (${info.regs.length} vehicles)`);
    });
  
  if (analysis.existingClients > 10) {
    console.log(`   ... and ${analysis.existingClients - 10} more`);
  }
  
  // Show sample of new regs
  console.log('\n='.repeat(80));
  console.log('\n📝 SAMPLE NEW REGISTRATIONS (first 20):\n');
  analysis.regs
    .filter(r => !r.exists)
    .slice(0, 20)
    .forEach(r => {
      console.log(`   Row ${r.rowIndex}: ${r.reg} → ${r.client}`);
    });
  
  if (analysis.newRegs > 20) {
    console.log(`   ... and ${analysis.newRegs - 20} more`);
  }
  
  console.log('\n='.repeat(80));
  console.log('\n✅ SCAN COMPLETE - Ready to insert!\n');
}

scanExcelData();
