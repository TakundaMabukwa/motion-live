const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'vehicles_with_cost_codes.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log('Columns:', Object.keys(data[0]));
console.log('\nFirst row sample:');
console.log(JSON.stringify(data[0], null, 2));
