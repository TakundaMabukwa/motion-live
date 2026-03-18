#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_FILE = path.join('stock-uploads', 'Sim card list Solflo.xlsx');
const DEFAULT_CATEGORY_CODE = 'SIMCARD';
const DEFAULT_CATEGORY_DESCRIPTION = 'SIM Cards';
const DEFAULT_COMPANY = 'Solflo';
const BATCH_SIZE = 500;

function getArgValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function clean(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function main() {
  const filePath = getArgValue('--file', DEFAULT_FILE);
  const categoryCode = clean(getArgValue('--category', DEFAULT_CATEGORY_CODE)).toUpperCase();
  const categoryDescription = clean(getArgValue('--description', DEFAULT_CATEGORY_DESCRIPTION));
  const company = clean(getArgValue('--company', DEFAULT_COMPANY));
  const dryRun = hasFlag('--dry-run');

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });

  if (!rows.length) {
    throw new Error('No rows found in Excel file');
  }

  const items = rows
    .map((row) => {
      const msisdn = clean(row['Number (MSISDN)']);
      const iccid = clean(row['SIM number (ICCID)']);
      const status = clean(row['Status']) || 'IN STOCK';
      const packageDeal = clean(row['Package/ Deal']);

      if (!iccid) return null;

      return {
        category_code: categoryCode,
        serial_number: iccid,
        company,
        status: 'IN STOCK',
        notes: [
          msisdn ? `MSISDN: ${msisdn}` : null,
          packageDeal ? `Package: ${packageDeal}` : null,
          status ? `Source Status: ${status}` : null,
        ].filter(Boolean).join(' | '),
      };
    })
    .filter(Boolean);

  const uniqueItems = Array.from(
    new Map(items.map((item) => [item.serial_number, item])).values()
  );

  console.log(`Workbook: ${filePath}`);
  console.log(`Sheet: ${firstSheet}`);
  console.log(`Rows read: ${rows.length}`);
  console.log(`Unique SIM items to import: ${uniqueItems.length}`);
  console.log(`Category: ${categoryCode} - ${categoryDescription}`);

  if (dryRun) {
    console.log('Dry run only. No database changes made.');
    console.log('Sample rows:');
    console.log(JSON.stringify(uniqueItems.slice(0, 5), null, 2));
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error: categoryError } = await supabase
    .from('inventory_categories')
    .upsert(
      [{ code: categoryCode, description: categoryDescription }],
      { onConflict: 'code' }
    );

  if (categoryError) {
    throw new Error(`Category upsert failed: ${categoryError.message}`);
  }

  for (const batch of chunk(uniqueItems, BATCH_SIZE)) {
    const { error } = await supabase
      .from('inventory_items')
      .upsert(batch, { onConflict: 'serial_number' });

    if (error) {
      throw new Error(`Item upsert failed: ${error.message}`);
    }
  }

  console.log(`Imported ${uniqueItems.length} SIM items into inventory_items.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
