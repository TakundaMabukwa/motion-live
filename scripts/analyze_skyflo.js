const XLSX = require('xlsx');

const workbook = XLSX.readFile('SkyFlo Updated list.xlsx');

console.log('📊 EXCEL FILE ANALYSIS\n');
console.log('='.repeat(80));
console.log(`\nTotal Sheets: ${workbook.SheetNames.length}\n`);

workbook.SheetNames.forEach((sheetName, index) => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Find header row
  const headerRow = data.find(row => row && row.length > 0 && 
    (row.some(cell => cell && cell.toString().toLowerCase().includes('reg')) ||
     row.some(cell => cell && cell.toString().toLowerCase().includes('fleet'))));
  
  const dataRows = data.filter(row => row && row.length > 0 && row !== headerRow);
  
  console.log(`${index + 1}. Sheet: "${sheetName}"`);
  console.log(`   Rows: ${dataRows.length}`);
  
  // Determine account prefix
  let prefix = '';
  if (sheetName.toLowerCase().includes('kargo')) {
    const match = sheetName.match(/\d+/);
    const num = match ? match[0].padStart(4, '0') : '0001';
    prefix = `KARG-${num}`;
  } else if (sheetName.toLowerCase().includes('auma')) {
    const match = sheetName.match(/\d+/);
    const num = match ? match[0].padStart(4, '0') : '0001';
    prefix = `AUMA-${num}`;
  } else if (sheetName.toLowerCase().includes('interspares')) {
    const match = sheetName.match(/\d+/);
    const num = match ? match[0].padStart(4, '0') : '0001';
    prefix = `INTE-${num}`;
  }
  
  console.log(`   Account: ${prefix || 'N/A'}`);
  
  if (headerRow) {
    console.log(`   Headers: ${headerRow.slice(0, 10).join(', ')}...`);
  }
  
  // Show sample data
  if (dataRows.length > 0) {
    console.log(`   Sample row: ${JSON.stringify(dataRows[0].slice(0, 5))}`);
  }
  
  console.log('');
});

console.log('='.repeat(80));
