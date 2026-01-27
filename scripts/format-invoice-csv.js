const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'vehicle_account_mapping.csv');
const outputFile = path.join(__dirname, 'formatted_invoice.csv');

// Read the input CSV
const data = fs.readFileSync(inputFile, 'utf-8');
const lines = data.split('\n');

// Output array
const output = [];
output.push('CLIENT,ACCOUNT NO.,GROUP,CODE,DESCRIPTION,QTY,PRICE EX.,PRICE INCL.,TOTAL INCL.');

// Skip header line
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Parse CSV line (handle quoted fields)
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
  
  const [client, accountNo, vehicleId, , , code, description, totalAmount] = fields;
  
  // Calculate prices (Total includes VAT, so divide by 1.15 to get ex VAT)
  const totalIncl = parseFloat(totalAmount) || 0;
  const priceEx = totalIncl / 1.15;
  const priceIncl = totalIncl;
  
  // Use vehicleId as GROUP, or accountNo if no vehicle
  const group = vehicleId || accountNo;
  
  output.push(`"${client}","${accountNo}","${group}","${code}","${description}",1,${priceEx.toFixed(2)},${priceIncl.toFixed(2)},${totalIncl.toFixed(2)}`);
}

// Write output
fs.writeFileSync(outputFile, output.join('\n'));
console.log(`✅ Formatted ${output.length - 1} records`);
console.log(`📄 Output saved to: ${outputFile}`);
