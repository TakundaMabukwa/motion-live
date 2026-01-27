const path = require('path');
const fs = require('fs');

const csvPath = path.join(__dirname, 'vehicles_not_in_db.csv');
const csvData = fs.readFileSync(csvPath, 'utf-8');
const lines = csvData.split('\n');

const outputLines = [];
let removed = 0;

// Keep header
outputLines.push(lines[0]);

// Filter out FAITHWHEELS lines
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('FAITHWHEELS')) {
    removed++;
  } else {
    outputLines.push(line);
  }
}

// Write back
fs.writeFileSync(csvPath, outputLines.join('\n'));

console.log(`✅ Removed ${removed} FAITHWHEELS vehicles from vehicles_not_in_db.csv`);
console.log(`📊 Remaining records: ${outputLines.length - 1}`);
