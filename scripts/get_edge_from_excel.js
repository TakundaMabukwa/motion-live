const XLSX = require('xlsx');

const workbook = XLSX.readFile('./scripts/20 JANUARY 2026 ANNUITY BILLING .xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const edgeAccounts = new Map();

data.forEach((row, index) => {
  if (index === 0) return;
  const accountName = row[0];
  const accountNumber = row[1];
  
  if (accountNumber && accountNumber.toString().includes('EDGE')) {
    edgeAccounts.set(accountNumber, accountName);
  }
});

console.log('Account Name | Account Number');
console.log('='.repeat(80));
[...edgeAccounts.entries()].sort().forEach(([accNum, accName]) => {
  console.log(`${accName} | ${accNum}`);
});
console.log(`\nTotal accounts found: ${edgeAccounts.size}`);
