const fs = require('fs');

function parseCSVLine(line) {
  const regex = /"([^"]*)"/g;
  const matches = [];
  let match;
  while ((match = regex.exec(line)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

const csv = fs.readFileSync('./scripts/vehicles_not_in_db.csv', 'utf-8');
const lines = csv.split('\n');

console.log('First 10 EDGE lines - Column 3 (Group):');
console.log('='.repeat(80));

let count = 0;
lines.forEach((line, idx) => {
  if (!line.includes('EDGE')) return;
  if (count >= 10) return;
  
  const fields = parseCSVLine(line);
  console.log(`Line ${idx}: "${fields[3]}"`);
  count++;
});
