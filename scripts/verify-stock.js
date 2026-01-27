// Script to verify stock import - checks all items have valid categories
// Run with: node scripts/verify-stock.js

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('========================================');
  console.log('STOCK IMPORT VERIFICATION');
  console.log('========================================\n');

  // 1. Get all categories
  console.log('1. Fetching all categories...');
  const { data: categories, error: catError } = await supabase
    .from('inventory_categories')
    .select('*')
    .order('code');

  if (catError) {
    console.error('Error fetching categories:', catError.message);
    return;
  }

  console.log(`   Found ${categories.length} categories\n`);

  // 2. Get all inventory items
  console.log('2. Fetching all inventory items...');
  const { data: items, error: itemsError } = await supabase
    .from('inventory_items')
    .select('*')
    .order('category_code');

  if (itemsError) {
    console.error('Error fetching items:', itemsError.message);
    return;
  }

  console.log(`   Found ${items.length} items\n`);

  // 3. Create category lookup
  const categoryMap = new Map(categories.map(c => [c.code, c]));

  // 4. Verify each item has a valid category
  console.log('3. Verifying category references...');
  const invalidItems = [];
  const itemsByCategory = {};

  items.forEach(item => {
    if (!categoryMap.has(item.category_code)) {
      invalidItems.push(item);
    } else {
      if (!itemsByCategory[item.category_code]) {
        itemsByCategory[item.category_code] = [];
      }
      itemsByCategory[item.category_code].push(item);
    }
  });

  if (invalidItems.length > 0) {
    console.log(`   ❌ Found ${invalidItems.length} items with INVALID category references:`);
    invalidItems.forEach(item => {
      console.log(`      - ID: ${item.id}, S/N: ${item.serial_number}, Category: ${item.category_code}`);
    });
  } else {
    console.log('   ✅ All items have valid category references\n');
  }

  // 5. Verify category counts match actual item counts
  console.log('4. Verifying category counts...');
  let countMismatches = 0;

  categories.forEach(cat => {
    const actualCount = itemsByCategory[cat.code]?.length || 0;
    if (cat.total_count !== actualCount) {
      console.log(`   ⚠️ ${cat.code}: stored count=${cat.total_count}, actual count=${actualCount}`);
      countMismatches++;
    }
  });

  if (countMismatches === 0) {
    console.log('   ✅ All category counts match actual item counts\n');
  } else {
    console.log(`   ⚠️ ${countMismatches} categories have count mismatches\n`);
  }

  // 6. Show detailed breakdown
  console.log('========================================');
  console.log('DETAILED CATEGORY BREAKDOWN');
  console.log('========================================\n');

  console.log('Category Code                          | Description                                      | Items | Status');
  console.log('---------------------------------------|--------------------------------------------------|-------|-------');

  categories.forEach(cat => {
    const actualCount = itemsByCategory[cat.code]?.length || 0;
    const status = cat.total_count === actualCount ? '✅' : '⚠️';
    const code = cat.code.padEnd(38);
    const desc = (cat.description || '').substring(0, 48).padEnd(48);
    console.log(`${code} | ${desc} | ${String(actualCount).padStart(5)} | ${status}`);
  });

  // 7. Sample items from each category
  console.log('\n========================================');
  console.log('SAMPLE ITEMS PER CATEGORY');
  console.log('========================================\n');

  Object.entries(itemsByCategory).slice(0, 10).forEach(([code, catItems]) => {
    const category = categoryMap.get(code);
    console.log(`\n${code} - ${category?.description || 'Unknown'} (${catItems.length} items)`);
    catItems.slice(0, 3).forEach(item => {
      console.log(`   └─ S/N: ${item.serial_number}, Status: ${item.status}`);
    });
    if (catItems.length > 3) {
      console.log(`   └─ ... and ${catItems.length - 3} more`);
    }
  });

  // 8. Check for duplicate serial numbers
  console.log('\n========================================');
  console.log('CHECKING FOR DUPLICATES');
  console.log('========================================\n');

  const serialCounts = {};
  items.forEach(item => {
    serialCounts[item.serial_number] = (serialCounts[item.serial_number] || 0) + 1;
  });

  const duplicates = Object.entries(serialCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log(`❌ Found ${duplicates.length} duplicate serial numbers:`);
    duplicates.forEach(([sn, count]) => {
      console.log(`   - "${sn}" appears ${count} times`);
    });
  } else {
    console.log('✅ No duplicate serial numbers found\n');
  }

  // 9. Final summary
  console.log('\n========================================');
  console.log('FINAL SUMMARY');
  console.log('========================================');
  console.log(`Total Categories: ${categories.length}`);
  console.log(`Total Items: ${items.length}`);
  console.log(`Invalid Category References: ${invalidItems.length}`);
  console.log(`Category Count Mismatches: ${countMismatches}`);
  console.log(`Duplicate Serial Numbers: ${duplicates.length}`);
  console.log(`\nVerification: ${invalidItems.length === 0 && duplicates.length === 0 ? '✅ PASSED' : '❌ ISSUES FOUND'}`);
}

main().catch(console.error);
