require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function matchClientsToCompanies() {
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
  
  // Get unique clients from Excel
  const clients = new Map();
  
  data.forEach(row => {
    const client = row.CLIENT;
    const group = row.GROUP;
    const accountNo = row['ACCOUNT NO.'];
    
    const regs = group.includes('-') && group.match(/[A-Z]{2,}[0-9]+/g) 
      ? group.split('-').map(r => r.trim())
      : [group.trim()];
    
    if (!clients.has(client)) {
      clients.set(client, {
        client: client,
        excelAccountNo: accountNo || '',
        vehicleCount: 0
      });
    }
    clients.get(client).vehicleCount += regs.length;
  });
  
  // Get all companies from DB
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('company, new_account_number')
    .not('company', 'is', null);
  
  const companiesInDB = new Map();
  vehicles.forEach(v => {
    const companyUpper = v.company.toUpperCase();
    if (!companiesInDB.has(companyUpper)) {
      companiesInDB.set(companyUpper, v.new_account_number);
    }
  });
  
  console.log(`\n📊 Found ${companiesInDB.size} unique companies in DB\n`);
  
  // Helper function for fuzzy matching
  const normalizeCompanyName = (name) => {
    return name
      .toUpperCase()
      .replace(/\(PTY\)\s*LTD/gi, '')
      .replace(/\(PTY\)/gi, '')
      .replace(/PTY\s*LTD/gi, '')
      .replace(/\bCC\b/gi, '')
      .replace(/\bLTD\b/gi, '')
      .replace(/\bLIMITED\b/gi, '')
      .replace(/\s+-\s+DIV\s+OF\s+MSCSA.*$/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  // Create normalized lookup
  const normalizedCompanies = new Map();
  vehicles.forEach(v => {
    const normalized = normalizeCompanyName(v.company);
    if (!normalizedCompanies.has(normalized)) {
      normalizedCompanies.set(normalized, {
        original: v.company,
        account: v.new_account_number
      });
    }
  });
  
  // Create VRN prefix lookup
  const vrnCompanies = new Map();
  vehicles.forEach(v => {
    if (v.company.toUpperCase().startsWith('VRN ')) {
      const suffix = v.company.substring(4).trim().toUpperCase();
      vrnCompanies.set(suffix, {
        original: v.company,
        account: v.new_account_number
      });
    }
  });
  
  // Create EDGE prefix lookup
  const edgeCompanies = new Map();
  vehicles.forEach(v => {
    if (v.new_account_number && v.new_account_number.toUpperCase().startsWith('EDGE-')) {
      const companyPart = v.company.replace(/^EDGE\s*-\s*/i, '').trim().toUpperCase();
      edgeCompanies.set(companyPart, {
        original: v.company,
        account: v.new_account_number
      });
    }
  });
  
  // Match clients to companies
  const csvLines = ['Client,Excel Account,DB Company,DB Account,Vehicle Count,Status,Match Type'];
  let exactMatchCount = 0;
  let fuzzyMatchCount = 0;
  let newCount = 0;
  
  Array.from(clients.values())
    .sort((a, b) => a.client.localeCompare(b.client))
    .forEach(c => {
      const clientUpper = c.client.toUpperCase();
      const clientNormalized = normalizeCompanyName(c.client);
      
      // Try exact match first
      let dbAccount = companiesInDB.get(clientUpper);
      let matchType = 'EXACT';
      let dbCompany = c.client;
      
      // Try fuzzy match if no exact match
      if (!dbAccount) {
        const fuzzyMatch = normalizedCompanies.get(clientNormalized);
        if (fuzzyMatch) {
          dbAccount = fuzzyMatch.account;
          dbCompany = fuzzyMatch.original;
          matchType = 'FUZZY';
        }
      }
      
      // Try VRN prefix match if still no match
      if (!dbAccount && clientUpper.startsWith('VRN ')) {
        const suffix = c.client.substring(4).trim().toUpperCase();
        const vrnMatch = vrnCompanies.get(suffix);
        if (vrnMatch) {
          dbAccount = vrnMatch.account;
          dbCompany = vrnMatch.original;
          matchType = 'VRN_PREFIX';
        }
      }
      
      // Try EDGE prefix match if still no match
      if (!dbAccount && clientUpper.startsWith('EDGE ')) {
        const companyPart = c.client.replace(/^EDGE\s*-\s*/i, '').trim().toUpperCase();
        const edgeMatch = edgeCompanies.get(companyPart);
        if (edgeMatch) {
          dbAccount = edgeMatch.account;
          dbCompany = edgeMatch.original;
          matchType = 'EDGE_PREFIX';
        }
      }
      
      if (dbAccount) {
        csvLines.push(`"${c.client}","${c.excelAccountNo}","${dbCompany}","${dbAccount}",${c.vehicleCount},"EXISTS","${matchType}"`);
        if (matchType === 'EXACT') exactMatchCount++;
        else fuzzyMatchCount++;
      } else {
        csvLines.push(`"${c.client}","${c.excelAccountNo}","","",${c.vehicleCount},"NEW",""`);
        newCount++;
      }
    });
  
  const csv = csvLines.join('\n');
  fs.writeFileSync('scripts/clients_matched.csv', csv);
  
  console.log(`✅ Exported to: scripts/clients_matched.csv\n`);
  console.log(`📊 RESULTS:`);
  console.log(`   ✅ Exact matches: ${exactMatchCount} clients`);
  console.log(`   🔍 Fuzzy matches: ${fuzzyMatchCount} clients`);
  console.log(`   ✅ Total matched: ${exactMatchCount + fuzzyMatchCount} clients exist in DB`);
  console.log(`   ❌ New: ${newCount} clients NOT in DB (will get EDGE accounts)\n`);
}

matchClientsToCompanies();
