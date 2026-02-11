const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.join(__dirname, 'NEW - Consolidated Solflo Template (3).xlsx');
const companiesPath = path.join(__dirname, 'companies.json');

const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const vehicles = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));

const companyMap = {};
companies.forEach(c => {
  const key = c.company.toLowerCase().trim();
  companyMap[key] = c.cost_code;
});

let matchCount = 0;
let noMatchCount = 0;

vehicles.forEach(vehicle => {
  const companyName = (vehicle['Company Name: '] || '').toLowerCase().trim();
  const reg = (vehicle['Reg: '] || '').trim();
  
  if (companyMap[companyName]) {
    vehicle['new_account_number'] = companyMap[companyName];
    matchCount++;
  } else {
    noMatchCount++;
    console.log(`No match: ${vehicle['Company Name: ']} (Reg: ${reg})`);
  }
});

const newSheet = XLSX.utils.json_to_sheet(vehicles);
const newWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Vehicles');
XLSX.writeFile(newWorkbook, path.join(__dirname, 'vehicles_with_cost_codes.xlsx'));

console.log(`\nMatched: ${matchCount}`);
console.log(`No match: ${noMatchCount}`);
console.log(`Total: ${vehicles.length}`);
console.log('\nUpdated file saved as: vehicles_with_cost_codes.xlsx');
