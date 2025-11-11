const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configure Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importStockFromExcel() {
  try {
    // Read Excel file
    const workbook = XLSX.readFile('STOCK LIST - 03.11.2025.xlsx');
    const targetSheets = ['NEW BEAME STOCK'];
    
    console.log('Available sheets:', workbook.SheetNames);
    
    let allData = [];
    for (const sheetName of targetSheets) {
      if (workbook.SheetNames.includes(sheetName)) {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet);
        console.log(`${sheetName}: ${sheetData.length} rows`);
        allData = allData.concat(sheetData.map(row => ({ ...row, _sheet: sheetName })));
      } else {
        console.log(`Sheet '${sheetName}' not found`);
      }
    }
    
    const data = allData;
    console.log(`Total rows from target sheets: ${data.length}`);
    
    if (data.length > 0) {
      console.log('Sample rows from each sheet:');
      console.log('First row:', JSON.stringify(data[0], null, 2));
      console.log('Column names:', Object.keys(data[0]));
    }

    const categories = new Map();
    const items = [];
    let currentCategory = null;

    for (const row of data) {
      const code = row['CODE'] || row['0'];
      const description = row.DESCRIPTION;
      const serialNumber = row['S/N'];
      const dateAdjusted = row['DATE ADJUSTED'];
      const container = row.CONTAINER;
      const direction = row.DIRECTION;

      // Skip empty rows or received rows
      if (!code || code.includes('RECEIVED')) {
        continue;
      }

      // Check if this is a category row (has TOTAL in code and no serial number)
      if (code.includes('TOTAL') && !serialNumber) {
        const categoryCode = code.split(' / ')[0];
        const totalMatch = code.match(/TOTAL (\d+)/);
        const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;
        
        currentCategory = {
          code: categoryCode,
          description: categoryCode,
          total_count: totalCount,
          date_adjusted: null
        };
        categories.set(categoryCode, currentCategory);
        console.log(`Found category: ${categoryCode} with ${totalCount} items`);
        continue;
      }

      // For NEW BEAME STOCK sheet, use BEAME as category
      if (serialNumber && !currentCategory && row._sheet === 'NEW BEAME STOCK') {
        currentCategory = {
          code: 'BEAME',
          description: 'BEAME STOCK',
          total_count: 0,
          date_adjusted: null
        };
        if (!categories.has('BEAME')) {
          categories.set('BEAME', currentCategory);
          console.log(`Created category: BEAME`);
        } else {
          currentCategory = categories.get('BEAME');
        }
      }

      // This is an item row
      if (serialNumber && currentCategory) {
        items.push({
          category_code: currentCategory.code,
          serial_number: serialNumber.toString(),
          date_adjusted: dateAdjusted ? new Date(dateAdjusted) : null,
          container: container || null,
          direction: direction || null,
          status: container === 'IN STOCK' ? 'IN STOCK' : 
                  (typeof container === 'string' && container.includes('INSTALLED')) ? 'INSTALLED' :
                  (typeof container === 'string' && container.includes('look for')) ? 'MISSING' : 'IN STOCK'
        });
        
        // Update category count
        if (categories.has(currentCategory.code)) {
          categories.get(currentCategory.code).total_count++;
        }
      }
    }

    // Insert categories
    const categoryArray = Array.from(categories.values());
    for (const category of categoryArray) {
      try {
        await supabase.from('inventory_categories').insert(category);
      } catch (error) {
        if (!error.message?.includes('duplicate')) {
          console.log('Category insert error:', error.message);
        }
      }
    }



    // Insert items individually to handle duplicates
    let insertedItems = 0;
    for (const item of items) {
      try {
        const { error } = await supabase
          .from('inventory_items')
          .insert(item);
        if (!error) insertedItems++;
      } catch (error) {
        if (!error.message?.includes('duplicate')) {
          console.log('Item insert error:', error.message);
        }
      }
    }
    console.log(`Inserted ${insertedItems} new items`);

    console.log(`Processed ${categoryArray.length} categories and ${items.length} total items`);
  } catch (error) {
    console.error('Import failed:', error);
  }
}

importStockFromExcel();