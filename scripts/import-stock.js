// Script to import Solflo stock from Excel to Supabase
// Run with: node scripts/import-stock.js

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

// Supabase config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials.');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load the Excel file
const filePath = path.join(__dirname, '..', 'Solflo stock.xlsx');

async function main() {
  console.log('========================================');
  console.log('SOLFLO STOCK IMPORT SCRIPT');
  console.log('========================================\n');
  
  console.log('Loading Excel file:', filePath);
  
  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch (error) {
    console.error('Error reading Excel file:', error.message);
    process.exit(1);
  }
  
  console.log('Sheets found:', workbook.SheetNames.join(', '));
  
  // Collect all categories and items
  const categories = new Map(); // code -> { code, description }
  const items = []; // array of inventory items
  const duplicateSerials = new Set();
  const seenSerials = new Set();
  
  // Process each sheet
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`\nProcessing sheet: "${sheetName}" (${data.length} rows)`);
    
    if (data.length === 0) return;
    
    data.forEach((row, idx) => {
      // Extract data - columns are CODE, DESCRIPTION, S/N
      const code = row['CODE'] ? String(row['CODE']).trim() : null;
      const description = row['DESCRIPTION'] ? String(row['DESCRIPTION']).trim() : null;
      const serialNumber = row['S/N'] ? String(row['S/N']).trim() : null;
      
      // Skip rows without code or serial number
      if (!code || !serialNumber) {
        return;
      }
      
      // Skip if code looks like a serial number (for the Skylink M Safety Kit issue)
      if (code.match(/^[A-Z]{4}\d{11}$/)) {
        return;
      }
      
      // Add to categories map (unique by code)
      if (!categories.has(code)) {
        categories.set(code, {
          code: code,
          description: description || sheetName,
          company: sheetName // Use sheet name as company/source
        });
      }
      
      // Check for duplicate serial numbers
      if (seenSerials.has(serialNumber)) {
        duplicateSerials.add(serialNumber);
        console.log(`  WARNING: Duplicate serial number found: ${serialNumber}`);
        return; // Skip duplicates
      }
      seenSerials.add(serialNumber);
      
      // Add to items array
      items.push({
        category_code: code,
        serial_number: serialNumber,
        status: 'IN STOCK',
        company: sheetName,
        notes: `Imported from ${sheetName} sheet`
      });
    });
  });
  
  console.log('\n========================================');
  console.log('EXTRACTION SUMMARY');
  console.log('========================================');
  console.log(`Total unique categories: ${categories.size}`);
  console.log(`Total items to import: ${items.length}`);
  console.log(`Duplicate serials skipped: ${duplicateSerials.size}`);
  
  // Ask for confirmation
  console.log('\n========================================');
  console.log('STARTING DATABASE IMPORT');
  console.log('========================================\n');
  
  // Step 1: Delete existing data
  console.log('Step 1: Deleting existing inventory data...');
  
  const { error: deleteItemsError } = await supabase
    .from('inventory_items')
    .delete()
    .neq('id', 0); // Delete all rows
  
  if (deleteItemsError) {
    console.error('Error deleting inventory_items:', deleteItemsError.message);
  } else {
    console.log('  ✓ Deleted all inventory_items');
  }
  
  const { error: deleteCategoriesError } = await supabase
    .from('inventory_categories')
    .delete()
    .neq('id', 0); // Delete all rows
  
  if (deleteCategoriesError) {
    console.error('Error deleting inventory_categories:', deleteCategoriesError.message);
  } else {
    console.log('  ✓ Deleted all inventory_categories');
  }
  
  // Step 2: Insert categories
  console.log('\nStep 2: Inserting categories...');
  
  const categoriesArray = Array.from(categories.values()).map(cat => ({
    code: cat.code,
    description: cat.description,
    total_count: 0,
    company: cat.company,
    date_adjusted: new Date().toISOString().split('T')[0]
  }));
  
  // Insert in batches of 50
  const categoryBatchSize = 50;
  let categoriesInserted = 0;
  
  for (let i = 0; i < categoriesArray.length; i += categoryBatchSize) {
    const batch = categoriesArray.slice(i, i + categoryBatchSize);
    const { error } = await supabase
      .from('inventory_categories')
      .insert(batch);
    
    if (error) {
      console.error(`  Error inserting categories batch ${i / categoryBatchSize + 1}:`, error.message);
      // Try inserting one by one to find the problematic record
      for (const cat of batch) {
        const { error: singleError } = await supabase
          .from('inventory_categories')
          .insert(cat);
        if (singleError) {
          console.error(`    Failed to insert category: ${cat.code} - ${singleError.message}`);
        } else {
          categoriesInserted++;
        }
      }
    } else {
      categoriesInserted += batch.length;
    }
  }
  
  console.log(`  ✓ Inserted ${categoriesInserted}/${categoriesArray.length} categories`);
  
  // Step 3: Insert inventory items
  console.log('\nStep 3: Inserting inventory items...');
  
  const itemBatchSize = 100;
  let itemsInserted = 0;
  let itemsFailed = 0;
  
  for (let i = 0; i < items.length; i += itemBatchSize) {
    const batch = items.slice(i, i + itemBatchSize);
    const { error } = await supabase
      .from('inventory_items')
      .insert(batch);
    
    if (error) {
      console.error(`  Error inserting items batch ${Math.floor(i / itemBatchSize) + 1}:`, error.message);
      // Try inserting one by one to find problematic records
      for (const item of batch) {
        const { error: singleError } = await supabase
          .from('inventory_items')
          .insert(item);
        if (singleError) {
          console.error(`    Failed: ${item.serial_number} (${item.category_code}) - ${singleError.message}`);
          itemsFailed++;
        } else {
          itemsInserted++;
        }
      }
    } else {
      itemsInserted += batch.length;
    }
    
    // Progress indicator
    if ((i + itemBatchSize) % 500 === 0 || i + itemBatchSize >= items.length) {
      console.log(`  Progress: ${Math.min(i + itemBatchSize, items.length)}/${items.length} items processed`);
    }
  }
  
  console.log(`  ✓ Inserted ${itemsInserted}/${items.length} items`);
  if (itemsFailed > 0) {
    console.log(`  ✗ Failed to insert ${itemsFailed} items`);
  }
  
  // Step 4: Update category counts
  console.log('\nStep 4: Updating category counts...');
  
  for (const [code, cat] of categories) {
    const { count, error: countError } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('category_code', code)
      .eq('status', 'IN STOCK');
    
    if (!countError) {
      await supabase
        .from('inventory_categories')
        .update({ total_count: count || 0 })
        .eq('code', code);
    }
  }
  
  console.log('  ✓ Updated category counts');
  
  // Final summary
  console.log('\n========================================');
  console.log('IMPORT COMPLETE');
  console.log('========================================');
  
  // Verify counts
  const { count: finalCategoryCount } = await supabase
    .from('inventory_categories')
    .select('*', { count: 'exact', head: true });
  
  const { count: finalItemCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Categories in database: ${finalCategoryCount}`);
  console.log(`Items in database: ${finalItemCount}`);
  
  // Show items by category
  console.log('\nItems by category:');
  const { data: categoryData } = await supabase
    .from('inventory_categories')
    .select('code, description, total_count')
    .order('total_count', { ascending: false });
  
  if (categoryData) {
    categoryData.forEach(cat => {
      console.log(`  ${cat.code}: ${cat.total_count} items - ${cat.description}`);
    });
  }
}

main().catch(console.error);
