require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function showNewEdgeAccounts() {
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
  
  // Get existing companies
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('company')
    .not('company', 'is', null);
  
  const existingCompanies = new Set(vehicles.map(v => v.company?.toUpperCase()));
  
  // Get last EDGE number
  const { data: edgeAccounts } = await supabase
    .from('vehicles')
    .select('new_account_number')
    .ilike('new_account_number', 'EDGE-%')
    .order('new_account_number', { ascending: false });
  
  const lastEdgeNumber = edgeAccounts && edgeAccounts.length > 0 
    ? parseInt(edgeAccounts[0].new_account_number.split('-')[1]) 
    : 0;
  
  // Collect unique clients
  const clients = new Map();
  
  data.forEach(row => {
    const client = row.CLIENT;
    const group = row.GROUP;
    
    const regs = group.includes('-') && group.match(/[A-Z]{2,}[0-9]+/g) 
      ? group.split('-').map(r => r.trim())
      : [group.trim()];
    
    const clientUpper = client.toUpperCase();
    
    if (!clients.has(clientUpper)) {
      clients.set(clientUpper, {
        name: client,
        exists: existingCompanies.has(clientUpper),
        vehicleCount: 0
      });
    }
    clients.get(clientUpper).vehicleCount += regs.length;
  });
  
  // Show new clients
  console.log('\n🆕 NEW CLIENTS TO GET EDGE ACCOUNTS:\n');
  console.log('='.repeat(80));
  
  let nextEdge = lastEdgeNumber + 1;
  const newClients = Array.from(clients.entries())
    .filter(([_, info]) => !info.exists)
    .sort((a, b) => a[0].localeCompare(b[0]));
  
  newClients.forEach(([client, info], idx) => {
    const newAccount = `EDGE-${String(nextEdge).padStart(4, '0')}`;
    console.log(`${idx + 1}. ${newAccount} → ${info.name} (${info.vehicleCount} vehicles)`);
    nextEdge++;
  });
  
  console.log('\n='.repeat(80));
  console.log(`\nTotal: ${newClients.length} new EDGE accounts (EDGE-${String(lastEdgeNumber + 1).padStart(4, '0')} to EDGE-${String(lastEdgeNumber + newClients.length).padStart(4, '0')})\n`);
}

showNewEdgeAccounts();
