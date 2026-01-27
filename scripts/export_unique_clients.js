const XLSX = require('xlsx');
const fs = require('fs');

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

// Get unique clients
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
      accountNo: accountNo || '',
      vehicleCount: 0
    });
  }
  clients.get(client).vehicleCount += regs.length;
});

// Convert to CSV
const csvLines = ['Client,Account Number,Vehicle Count'];
Array.from(clients.values())
  .sort((a, b) => a.client.localeCompare(b.client))
  .forEach(c => {
    csvLines.push(`"${c.client}","${c.accountNo}",${c.vehicleCount}`);
  });

const csv = csvLines.join('\n');

// Write to file
fs.writeFileSync('scripts/unique_clients.csv', csv);

console.log(`✅ Exported ${clients.size} unique clients to: scripts/unique_clients.csv\n`);
console.log('First 10 clients:');
Array.from(clients.values()).slice(0, 10).forEach(c => {
  console.log(`  ${c.client} | ${c.accountNo || 'NO ACCOUNT'} | ${c.vehicleCount} vehicles`);
});
