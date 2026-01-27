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
const line = lines.find(l => l.includes('VDV2212-CF329897'));
const fields = parseCSVLine(line);

console.log('Field 3:', fields[3]);
console.log('Normalized:', fields[3].toUpperCase().replace(/[\s-]/g, ''));
console.log('Parts:', fields[3].split('-'));
