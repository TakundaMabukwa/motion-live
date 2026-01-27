// Script to explore the Excel file structure
const XLSX = require('xlsx');
const path = require('path');

// Load the Excel file
const filePath = path.join(__dirname, '..', 'Solflo stock.xlsx');
console.log('Loading file:', filePath);

try {
  const workbook = XLSX.readFile(filePath);
  
  console.log('\n========================================');
  console.log('EXCEL FILE STRUCTURE ANALYSIS');
  console.log('========================================\n');
  
  console.log('Sheet Names:', workbook.SheetNames);
  console.log('Total Sheets:', workbook.SheetNames.length);
  
  // Analyze each sheet
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\n----------------------------------------`);
    console.log(`SHEET ${index + 1}: "${sheetName}"`);
    console.log(`----------------------------------------`);
    
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (data.length === 0) {
      console.log('  (Empty sheet)');
      return;
    }
    
    // Get headers (first row)
    const headers = data[0];
    console.log('\nColumns/Headers:');
    headers.forEach((header, i) => {
      console.log(`  ${i}: "${header}"`);
    });
    
    console.log(`\nTotal Rows (including header): ${data.length}`);
    console.log(`Data Rows: ${data.length - 1}`);
    
    // Show first 5 data rows as sample
    console.log('\nSample Data (first 5 rows):');
    for (let i = 1; i <= Math.min(5, data.length - 1); i++) {
      console.log(`  Row ${i}:`, JSON.stringify(data[i]));
    }
    
    // Analyze unique values in potential category/code columns
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    if (jsonData.length > 0) {
      const keys = Object.keys(jsonData[0]);
      
      // Look for code/category columns
      keys.forEach(key => {
        const keyLower = key.toLowerCase();
        if (keyLower.includes('code') || keyLower.includes('category') || keyLower.includes('type') || keyLower.includes('description')) {
          const uniqueValues = [...new Set(jsonData.map(row => row[key]).filter(v => v))];
          console.log(`\nUnique values in "${key}" (${uniqueValues.length} unique):`);
          uniqueValues.slice(0, 10).forEach(v => console.log(`    - ${v}`));
          if (uniqueValues.length > 10) {
            console.log(`    ... and ${uniqueValues.length - 10} more`);
          }
        }
      });
    }
  });
  
  // Now let's get ALL data for import
  console.log('\n\n========================================');
  console.log('FULL DATA EXTRACTION FOR IMPORT');
  console.log('========================================\n');
  
  const allCategories = new Map(); // code -> description
  const allItems = [];
  
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`\nProcessing sheet: "${sheetName}" (${jsonData.length} rows)`);
    
    if (jsonData.length === 0) return;
    
    // Print all column names for this sheet
    const columns = Object.keys(jsonData[0]);
    console.log('  Columns:', columns);
    
    jsonData.forEach((row, idx) => {
      // Try to find code and serial number columns
      // Common patterns: "Code", "Category Code", "Item Code", "Serial", "Serial Number", "S/N"
      let code = null;
      let serialNumber = null;
      let description = null;
      let container = null;
      let status = null;
      let company = null;
      let notes = null;
      
      // Search through all keys
      Object.keys(row).forEach(key => {
        const keyLower = key.toLowerCase().trim();
        const value = row[key];
        
        if (!code && (keyLower === 'code' || keyLower.includes('category code') || keyLower.includes('item code') || keyLower === 'category')) {
          code = String(value).trim();
        }
        if (!serialNumber && (keyLower.includes('serial') || keyLower === 's/n' || keyLower === 'sn' || keyLower.includes('imei'))) {
          serialNumber = String(value).trim();
        }
        if (!description && (keyLower.includes('description') || keyLower.includes('name') || keyLower.includes('product'))) {
          description = String(value).trim();
        }
        if (!container && (keyLower.includes('container') || keyLower.includes('location') || keyLower.includes('bin'))) {
          container = String(value).trim();
        }
        if (!status && (keyLower.includes('status'))) {
          status = String(value).trim();
        }
        if (!company && (keyLower.includes('company') || keyLower.includes('supplier'))) {
          company = String(value).trim();
        }
        if (!notes && (keyLower.includes('note') || keyLower.includes('comment') || keyLower.includes('remark'))) {
          notes = String(value).trim();
        }
      });
      
      // If we found a code, add to categories
      if (code && code !== 'undefined' && code !== 'null') {
        if (!allCategories.has(code)) {
          allCategories.set(code, description || sheetName);
        }
      }
      
      // If we found a serial number, add to items
      if (serialNumber && serialNumber !== 'undefined' && serialNumber !== 'null' && serialNumber.length > 0) {
        allItems.push({
          category_code: code || sheetName,
          serial_number: serialNumber,
          container: container,
          status: status || 'IN STOCK',
          company: company,
          notes: notes,
          sheet: sheetName
        });
      }
      
      if (idx < 3) {
        console.log(`  Sample row ${idx + 1}:`, { code, serialNumber, description, container, status });
      }
    });
  });
  
  console.log('\n\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total unique categories found: ${allCategories.size}`);
  console.log(`Total items found: ${allItems.length}`);
  
  console.log('\nCategories:');
  allCategories.forEach((desc, code) => {
    console.log(`  ${code}: ${desc}`);
  });
  
  console.log('\nItems by category:');
  const itemsByCategory = {};
  allItems.forEach(item => {
    if (!itemsByCategory[item.category_code]) {
      itemsByCategory[item.category_code] = 0;
    }
    itemsByCategory[item.category_code]++;
  });
  Object.entries(itemsByCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} items`);
  });
  
} catch (error) {
  console.error('Error reading Excel file:', error.message);
  console.error('Make sure the file exists at:', filePath);
}
