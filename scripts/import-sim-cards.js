#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_FILE = path.join('stock-uploads', 'Sim card list Solflo.xlsx');
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

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function clean(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function toCategoryCode(value) {
  const normalized = clean(value)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  return normalized ? `SIM_${normalized}` : 'SIM_UNCATEGORIZED';
}

function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function main() {
  loadDotEnv(path.join(process.cwd(), '.env.local'));

  const filePath = getArgValue('--file', DEFAULT_FILE);
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

  const categories = new Map();
  const items = rows
    .map((row) => {
      const msisdn = clean(row['Number (MSISDN)'] || row['MSISDN']);
      const iccid = clean(row['SIM number (ICCID)'] || row['serial'] || row['Serial'] || row['ICCID']);
      const status = clean(row['Status']) || 'IN STOCK';
      const packageDeal = clean(row['Package/ Deal'] || row['category'] || row['Category']) || 'SIM Cards';
      const categoryCode = toCategoryCode(packageDeal);

      if (packageDeal) {
        categories.set(categoryCode, {
          code: categoryCode,
          description: packageDeal,
        });
      }

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
  console.log(`Categories to import: ${categories.size}`);

  if (dryRun) {
    console.log('Dry run only. No database changes made.');
    console.log('Category sample:');
    console.log(JSON.stringify(Array.from(categories.values()).slice(0, 5), null, 2));
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
    .upsert(Array.from(categories.values()), { onConflict: 'code' });

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
