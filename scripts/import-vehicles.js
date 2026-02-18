const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('c:\\Users\\mabuk\\Desktop\\Systems\\Solflo\\motion-live\\components\\accounts\\NEW - Consolidated Solflo Template (3).xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

// Read companies JSON
const companies = JSON.parse(fs.readFileSync('c:\\Users\\mabuk\\Desktop\\Systems\\Solflo\\motion-live\\scripts\\companies.json', 'utf8'));

// Create a map for quick company lookup
const companyMap = new Map();
companies.forEach(c => {
  companyMap.set(c.company.toLowerCase().trim(), c.cost_code);
});

console.log('=== EXCEL DATA PREVIEW ===\n');
console.log(`Total rows: ${data.length}\n`);

// Show first 3 rows with headers
console.log('First 3 rows:');
data.slice(0, 3).forEach((row, index) => {
  console.log(`\n--- Row ${index + 1} ---`);
  Object.keys(row).forEach(key => {
    console.log(`${key}: ${row[key]}`);
  });
});

console.log('\n\n=== COMPANY MATCHING ===\n');

// Process and match companies
const matched = [];
const unmatched = [];

data.forEach((row, index) => {
  const companyName = row['Company Name: '] || row.Company || row.company || '';
  const companyKey = companyName.toLowerCase().trim();
  const costCode = companyMap.get(companyKey);
  
  if (costCode) {
    matched.push({
      rowIndex: index + 1,
      company: companyName,
      costCode: costCode
    });
  } else if (companyName) {
    unmatched.push({
      rowIndex: index + 1,
      company: companyName
    });
  }
});

console.log(`Matched companies: ${matched.length}`);
console.log(`Unmatched companies: ${unmatched.length}`);
console.log(`Empty company names: ${data.length - matched.length - unmatched.length}\n`);

// Show matched companies
console.log('\n=== MATCHED COMPANIES (First 10) ===');
matched.slice(0, 10).forEach(m => {
  console.log(`Row ${m.rowIndex}: "${m.company}" => ${m.costCode}`);
});

// Show unmatched companies
if (unmatched.length > 0) {
  console.log('\n\n=== UNMATCHED COMPANIES ===');
  unmatched.forEach(u => {
    console.log(`Row ${u.rowIndex}: "${u.company}"`);
  });
}

// Save processed data for SQL insertion
const processedData = data.map((row, index) => {
  const companyName = row['Company Name: '] || row.Company || row.company || '';
  const companyKey = companyName.toLowerCase().trim();
  const costCode = companyMap.get(companyKey);
  
  return {
    ...row,
    new_account_number: costCode || null
  };
});

fs.writeFileSync(
  'c:\\Users\\mabuk\\Desktop\\Systems\\Solflo\\motion-live\\scripts\\processed-vehicles.json',
  JSON.stringify(processedData, null, 2)
);

console.log('\n\n=== SUMMARY ===');
console.log(`Processed data saved to: processed-vehicles.json`);
console.log(`Total vehicles: ${processedData.length}`);
console.log(`With cost codes: ${matched.length}`);
console.log(`Without cost codes: ${unmatched.length + (data.length - matched.length - unmatched.length)}`);
