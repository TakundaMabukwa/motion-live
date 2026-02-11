const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'NEW - Consolidated Solflo Template (3).xlsx');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('Total rows:', data.length);
console.log('\nColumn names:');
console.log(Object.keys(data[0]).join('\n'));
console.log('\nFirst 3 rows sample:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));
