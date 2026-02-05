const XLSX = require('xlsx');

const workbook = XLSX.readFile('SkyFlo Updated list.xlsx');
const sheet = workbook.Sheets['Auma']; // Use Auma as sample
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('📋 COLUMN MAPPING ANALYSIS\n');
console.log('='.repeat(80));

const headers = data[0];
console.log('\nExcel Headers:\n');
headers.forEach((h, i) => {
  if (h) console.log(`${i}: ${h}`);
});

console.log('\n' + '='.repeat(80));
console.log('\nSample Data Row:\n');
const sampleRow = data[1];
headers.forEach((h, i) => {
  if (h && sampleRow[i]) {
    console.log(`${h}: ${sampleRow[i]}`);
  }
});
