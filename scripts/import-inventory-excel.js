const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importInventoryFromExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const targetSheets = ['VUEWO', 'MTX', 'SKYLINK', 'FUEL PROBE'];
  
  for (const sheetName of workbook.SheetNames) {
    if (!targetSheets.includes(sheetName)) continue;
    
    console.log(`Processing sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    await processSheetData(data);
  }
  
  console.log('Import completed');
}

async function processSheetData(data) {
  let currentCategory = null;
  let itemCount = 0;
  
  for (const row of data) {
    if (!row || !row[0]) continue;
    
    // Skip header row
    if (row[0] === 'CODE' || row[0] === 'Code') continue;
    
    // Check for category headers (with / TOTAL or just descriptive text)
    if (row[0].includes(' / TOTAL ') || (!row[1] && !row[2] && row[0].length > 10)) {
      currentCategory = await processCategoryHeader(row[0]);
    } else if (row[0] && row[1]) {
      // Process any row with at least code and description
      await processInventoryItem(row, currentCategory);
      itemCount++;
    }
  }
  
  console.log(`Processed ${itemCount} items`);
}

async function processCategoryHeader(headerText) {
  let code, totalCount = 0, description = headerText;
  
  // Try to match "CODE / TOTAL NUMBER" format
  const totalMatch = headerText.match(/^(.+?)\s*\/\s*TOTAL\s+(\d+)/);
  if (totalMatch) {
    [, code, totalCount] = totalMatch;
    code = code.trim();
    totalCount = parseInt(totalCount);
  } else {
    // For descriptive headers like "A3 MEC 5 CABLE - RECEIVED - 12.03.2025"
    // Extract first part as code
    code = headerText.split(' ')[0] + '-' + headerText.split(' ')[1] + '-' + headerText.split(' ')[2];
    code = code.replace(/[^A-Z0-9-]/g, '');
  }
  
  const category = {
    code: code,
    description: description,
    total_count: totalCount,
    company: 'SOLFLO'
  };
  
  const { data, error } = await supabase
    .from('inventory_categories')
    .upsert(category, { onConflict: 'code' })
    .select()
    .single();
  
  if (error) console.error(`Category error:`, error);
  else console.log(`Category: ${category.code}`);
  
  return data || category;
}

async function processInventoryItem(row, category) {
  const [code, description, serialNumber, dateAdjusted, container, direction] = row;
  
  if (!code || !description) return;
  
  // Convert all values to strings to avoid type errors
  const containerStr = container ? String(container) : '';
  const serialStr = serialNumber ? String(serialNumber) : '';
  const directionStr = direction ? String(direction) : null;
  
  // Skip if container contains "BOOT STOCK"
  if (containerStr.toLowerCase().includes('boot stock')) {
    console.log(`Skipped BOOT STOCK item: ${serialStr}`);
    return;
  }
  
  // Use the item's code as the category_code
  const categoryCode = String(code);
  
  // Create category if it doesn't exist
  await supabase
    .from('inventory_categories')
    .upsert({
      code: categoryCode,
      description: String(description),
      total_count: 0,
      company: 'SOLFLO'
    }, { onConflict: 'code' });
  
  let parsedDate = null;
  if (dateAdjusted) {
    const date = new Date(dateAdjusted);
    if (!isNaN(date.getTime())) {
      parsedDate = date.toISOString().split('T')[0];
    }
  }
  
  const status = containerStr.toLowerCase().includes('in stock') ? 'IN STOCK' : 'AVAILABLE';
  
  const item = {
    category_code: categoryCode,
    serial_number: serialStr || `${categoryCode}-${Date.now()}`,
    date_adjusted: parsedDate,
    container: containerStr,
    direction: directionStr,
    status,
    company: 'SOLFLO'
  };
  
  const { error } = await supabase
    .from('inventory_items')
    .upsert(item, { onConflict: 'serial_number' });
  
  if (error) console.error(`Item error:`, error);
  else console.log(`Item: ${item.serial_number} -> ${categoryCode}`);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node import-inventory-excel.js <excel-file-path>');
  process.exit(1);
}

importInventoryFromExcel(filePath).catch(console.error);