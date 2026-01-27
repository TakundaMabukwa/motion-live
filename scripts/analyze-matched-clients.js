const path = require('path');
const fs = require('fs');

async function main() {
  console.log('========================================');
  console.log('ANALYZING MATCHED CLIENTS');
  console.log('========================================\n');

  // Read the matched CSV
  const csvPath = path.join(__dirname, 'vehicles_with_matched_accounts.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvData.split('\n');
  
  // Group by client
  const clientGroups = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);
    
    const newAccountNumber = fields[0];
    const matchCount = fields[1];
    const client = fields[2];
    const accountNo = fields[3];
    const group = fields[5]; // GROUP column
    
    if (!clientGroups[client]) {
      clientGroups[client] = {
        newAccountNumber,
        accountNo,
        vehicles: []
      };
    }
    
    clientGroups[client].vehicles.push({
      group,
      newAccountNumber,
      fullLine: line
    });
  }
  
  console.log('📊 MATCHED CLIENTS:\n');
  Object.entries(clientGroups).forEach(([client, data]) => {
    console.log(`${client}`);
    console.log(`  Account No: ${data.accountNo}`);
    console.log(`  New Account Number: ${data.newAccountNumber}`);
    console.log(`  Vehicles: ${data.vehicles.length}`);
    console.log('');
  });
  
  console.log(`\n✅ Total unique clients: ${Object.keys(clientGroups).length}`);
  console.log(`✅ Total vehicles to insert: ${lines.length - 1}\n`);
  
  console.log('========================================');
  console.log('CLIENTS SUMMARY');
  console.log('========================================\n');
  
  Object.entries(clientGroups).sort((a, b) => b[1].vehicles.length - a[1].vehicles.length).forEach(([client, data]) => {
    console.log(`${data.vehicles.length} vehicles - ${client} (${data.newAccountNumber})`);
  });
}

main().catch(console.error);
