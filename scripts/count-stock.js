// Quick count check
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('========================================');
  console.log('VERIFYING ALL INVENTORY ITEMS');
  console.log('========================================\n');

  // Get all categories first for lookup
  const { data: categories } = await supabase
    .from('inventory_categories')
    .select('code, description');
  
  const categoryMap = new Map(categories.map(c => [c.code, c.description]));
  console.log(`Loaded ${categories.length} categories for validation\n`);

  // Fetch ALL items with pagination
  let allItems = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('id');
    
    if (error) {
      console.error('Error fetching items:', error.message);
      break;
    }
    
    if (!items || items.length === 0) break;
    
    allItems = allItems.concat(items);
    console.log(`Fetched page ${page + 1}: ${items.length} items (total: ${allItems.length})`);
    
    if (items.length < pageSize) break;
    page++;
  }

  console.log(`\nTotal items fetched: ${allItems.length}\n`);

  // Validate each item
  const issues = {
    missingSerial: [],
    emptySerial: [],
    invalidCategory: [],
    invalidStatus: [],
    duplicateSerials: []
  };

  const validStatuses = ['IN STOCK', 'ASSIGNED', 'INSTALLED', 'RETURNED', 'DAMAGED'];
  const serialCounts = {};

  console.log('Validating items...\n');

  for (const item of allItems) {
    // Check serial number
    if (!item.serial_number) {
      issues.missingSerial.push(item);
    } else if (item.serial_number.trim() === '') {
      issues.emptySerial.push(item);
    }

    // Check category exists
    if (!categoryMap.has(item.category_code)) {
      issues.invalidCategory.push(item);
    }

    // Check status
    if (!validStatuses.includes(item.status)) {
      issues.invalidStatus.push(item);
    }

    // Track serial numbers for duplicates
    const key = item.serial_number;
    serialCounts[key] = (serialCounts[key] || 0) + 1;
  }

  // Find duplicates
  for (const [serial, count] of Object.entries(serialCounts)) {
    if (count > 1) {
      const dupes = allItems.filter(i => i.serial_number === serial);
      issues.duplicateSerials.push({ serial, count, items: dupes });
    }
  }

  // Print sample items
  console.log('========================================');
  console.log('SAMPLE ITEMS (first 20)');
  console.log('========================================\n');
  
  allItems.slice(0, 20).forEach((item, idx) => {
    console.log(`${idx + 1}. [${item.category_code}] S/N: ${item.serial_number} | Status: ${item.status}`);
  });

  // Print issues
  console.log('\n========================================');
  console.log('VALIDATION RESULTS');
  console.log('========================================\n');

  console.log(`Total Items Checked: ${allItems.length}`);
  console.log(`Missing Serial Number: ${issues.missingSerial.length}`);
  console.log(`Empty Serial Number: ${issues.emptySerial.length}`);
  console.log(`Invalid Category: ${issues.invalidCategory.length}`);
  console.log(`Invalid Status: ${issues.invalidStatus.length}`);
  console.log(`Duplicate Serial Numbers: ${issues.duplicateSerials.length}`);

  if (issues.missingSerial.length > 0) {
    console.log('\n❌ Items with missing serial numbers:');
    issues.missingSerial.slice(0, 10).forEach(i => {
      console.log(`   ID: ${i.id}, Category: ${i.category_code}`);
    });
  }

  if (issues.invalidCategory.length > 0) {
    console.log('\n❌ Items with invalid categories:');
    issues.invalidCategory.slice(0, 10).forEach(i => {
      console.log(`   ID: ${i.id}, Category: ${i.category_code}, S/N: ${i.serial_number}`);
    });
  }

  if (issues.invalidStatus.length > 0) {
    console.log('\n❌ Items with invalid status:');
    issues.invalidStatus.slice(0, 10).forEach(i => {
      console.log(`   ID: ${i.id}, Status: "${i.status}", S/N: ${i.serial_number}`);
    });
  }

  if (issues.duplicateSerials.length > 0) {
    console.log('\n⚠️ Duplicate serial numbers:');
    issues.duplicateSerials.slice(0, 10).forEach(d => {
      console.log(`   "${d.serial}" appears ${d.count} times in categories: ${d.items.map(i => i.category_code).join(', ')}`);
    });
  }

  // Status breakdown
  console.log('\n========================================');
  console.log('STATUS BREAKDOWN');
  console.log('========================================\n');

  const statusCounts = {};
  allItems.forEach(item => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
  });

  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`${status}: ${count} items`);
  }

  // Final result
  const totalIssues = issues.missingSerial.length + issues.emptySerial.length + 
                      issues.invalidCategory.length + issues.invalidStatus.length;

  console.log('\n========================================');
  console.log('FINAL RESULT');
  console.log('========================================');
  console.log(`\nVerification: ${totalIssues === 0 ? '✅ ALL ITEMS VALID' : `❌ ${totalIssues} ISSUES FOUND`}`);
  if (issues.duplicateSerials.length > 0) {
    console.log(`Note: ${issues.duplicateSerials.length} duplicate serial numbers found (may be intentional)`);
  }
}

main().catch(console.error);
