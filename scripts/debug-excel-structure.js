const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

async function main() {
  console.log('========================================');
  console.log('EXCEL STRUCTURE ANALYSIS');
  console.log('========================================\n');

  // Read Excel file
  const excelPath = path.join(__dirname, '20 JANUARY 2026 ANNUITY BILLING .xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found:', excelPath);
    return;
  }

  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Get raw data to see structure
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('First 10 rows of raw data:');
  rawData.slice(0, 10).forEach((row, index) => {
    console.log(`Row ${index}:`, row);
  });

  // Find header row
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => 
      typeof cell === 'string' && 
      (cell.includes('CLIENT') || cell.includes('ACCOUNT') || cell.includes('CODE'))
    )) {
      headerRowIndex = i;
      console.log(`\nHeader row found at index ${i}:`, row);
      break;
    }
  }

  if (headerRowIndex >= 0) {
    // Convert to JSON using the header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      range: headerRowIndex,
      header: 1 
    });
    
    console.log('\nFirst 5 data rows as JSON:');
    jsonData.slice(0, 5).forEach((row, index) => {
      console.log(`Data row ${index + 1}:`, JSON.stringify(row, null, 2));
    });

    // Show unique values in potential account columns
    const accountColumns = Object.keys(jsonData[0] || {}).filter(key => 
      key.toLowerCase().includes('account') || 
      key.toLowerCase().includes('client') ||
      key.toLowerCase().includes('group')
    );
    
    console.log('\nPotential account-related columns:', accountColumns);
    
    accountColumns.forEach(col => {
      const uniqueValues = [...new Set(jsonData.map(row => row[col]).filter(val => val))].slice(0, 10);
      console.log(`\nUnique values in "${col}" (first 10):`, uniqueValues);
    });
  }
}

main().catch(console.error);