const XLSX = require('xlsx');

const workbook = XLSX.readFile('scripts/NEW - Consolidated Solflo Template (3).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const headerRowIndex = rawData.findIndex(row => 
  row && row.some(cell => cell && cell.toString().toLowerCase().includes('reg'))
);

const headers = rawData[headerRowIndex].map(h => h ? h.toString().trim() : '').filter(h => h);

console.log('Excel Headers:');
headers.forEach((h, i) => {
  console.log(`${i + 1}. "${h}"`);
});

console.log('\n\nColumn Mapping (copy this):');
console.log('const columnMapping = {');
headers.forEach(h => {
  const dbCol = h
    .toLowerCase()
    .replace(/:/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/_+/g, '_')
    .replace(/^(\d)/, '_$1');
  console.log(`  '${h}': '${dbCol}',`);
});
console.log('};');
