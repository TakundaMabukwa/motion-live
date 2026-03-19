#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_FILE = path.join('stock-uploads', 'STOCK.xlsx');
const DEFAULT_SHEET_INDEX = 0;
const BATCH_SIZE = 500;

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
  return String(value ?? '').replace(/\u00A0/g, ' ').trim();
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function excelDateToIsoDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const yyyy = String(parsed.y).padStart(4, '0');
    const mm = String(parsed.m).padStart(2, '0');
    const dd = String(parsed.d).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const asString = clean(value);
  if (!asString) return null;
  const asDate = new Date(asString);
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate.toISOString().slice(0, 10);
}

function buildNotes(row) {
  const parts = [
    clean(row['DESCRIPTION']) ? `Description: ${clean(row['DESCRIPTION'])}` : null,
    clean(row['ADJUSTING DOC. TYPE']) ? `Doc Type: ${clean(row['ADJUSTING DOC. TYPE'])}` : null,
    clean(row['ADJUSTING DOC. NO.']) ? `Doc No: ${clean(row['ADJUSTING DOC. NO.'])}` : null,
    clean(row['ACCOUNT']) ? `Account: ${clean(row['ACCOUNT'])}` : null,
  ].filter(Boolean);
  return parts.join(' | ') || null;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--file' && argv[index + 1]) {
      result.file = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === '--sheet' && argv[index + 1]) {
      result.sheet = argv[index + 1];
      index += 1;
      continue;
    }
  }
  return result;
}

function parseWorkbookRows(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rawRows.length) {
    throw new Error('Workbook does not contain any rows to import');
  }

  const firstRow = rawRows[0].map((value) => clean(value));
  const isSerialReportFormat =
    firstRow.includes('Stock Code') &&
    firstRow.includes('Stock Description') &&
    firstRow.includes('Serial Number');

  if (isSerialReportFormat) {
    const header = firstRow;
    const dataRows = rawRows
      .slice(1)
      .filter((row) => row.some((cell) => clean(cell)))
      .map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]])));

    return {
      format: 'serial_report',
      dataRows,
      categories: Array.from(
        new Map(
          dataRows
            .map((row) => {
              const code = clean(row['Stock Code']);
              const description = clean(row['Stock Description']);
              return [code, { code, description }];
            })
            .filter(([code, item]) => code && item.description)
        ).values()
      ),
      items: dataRows
        .map((row) => ({
          category_code: clean(row['Stock Code']),
          serial_number: clean(row['Serial Number']),
          date_adjusted: null,
          container: null,
          direction: null,
          status: Number(row['Qty On Hand']) > 0 ? 'IN STOCK' : 'OUT OF STOCK',
          company: null,
          notes: clean(row['Stock Description']) ? `Description: ${clean(row['Stock Description'])}` : null,
        }))
        .filter((item) => item.category_code && item.serial_number),
    };
  }

  if (rawRows.length < 3) {
    throw new Error('Workbook does not contain enough rows to import');
  }

  const header = rawRows[1].map((value) => clean(value));
  const dataRows = rawRows
    .slice(2)
    .filter((row) => row.some((cell) => clean(cell)))
    .map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]])));

  return {
    format: 'stock_adjustment',
    dataRows,
    categories: Array.from(
      new Map(
        dataRows
          .map((row) => {
            const code = clean(row['CODE']);
            const description = clean(row['DESCRIPTION']);
            return [code, { code, description }];
          })
          .filter(([code, item]) => code && item.description)
      ).values()
    ),
    items: dataRows
      .map((row) => ({
        category_code: clean(row['CODE']),
        serial_number: clean(row['S/N']),
        date_adjusted: excelDateToIsoDate(row['DATE ADJUSTED']),
        container: clean(row['CONTAINER']) || null,
        direction: clean(row['DIRECTION']) || null,
        status: 'IN STOCK',
        company: clean(row['CLIENT/SUPPLIER']) || null,
        notes: buildNotes(row),
      }))
      .filter((item) => item.category_code && item.serial_number),
  };
}

async function main() {
  loadDotEnv(path.join(process.cwd(), '.env.local'));

  const args = parseArgs(process.argv.slice(2));
  const filePath = args.file || DEFAULT_FILE;
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = args.sheet || workbook.SheetNames[DEFAULT_SHEET_INDEX];
  const { format, dataRows, categories, items: rawItems } = parseWorkbookRows(workbook, sheetName);

  const duplicateSerials = new Map();
  const items = [];
  const seenSerials = new Set();

  for (const item of rawItems) {
    const categoryCode = clean(item.category_code);
    const serialNumber = clean(item.serial_number);
    if (!categoryCode || !serialNumber) continue;

    if (seenSerials.has(serialNumber)) {
      duplicateSerials.set(serialNumber, (duplicateSerials.get(serialNumber) || 1) + 1);
      continue;
    }
    seenSerials.add(serialNumber);

    items.push({
      ...item,
      category_code: categoryCode,
      serial_number: serialNumber,
    });
  }

  console.log(`Workbook: ${filePath}`);
  console.log(`Sheet: ${sheetName}`);
  console.log(`Detected format: ${format}`);
  console.log(`Rows read: ${dataRows.length}`);
  console.log(`Categories to insert: ${categories.length}`);
  console.log(`Items to insert: ${items.length}`);
  console.log(`Duplicate serials skipped from workbook: ${duplicateSerials.size}`);
  if (duplicateSerials.size) {
    console.log('Duplicate serial samples:');
    console.log(JSON.stringify(Array.from(duplicateSerials.entries()).slice(0, 10), null, 2));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error: categoryError } = await supabase
    .from('inventory_categories')
    .upsert(categories, { onConflict: 'code' });
  if (categoryError) {
    throw new Error(`Category insert failed: ${categoryError.message}`);
  }

  const existingSerials = new Set();
  for (const serialBatch of chunk(items.map((item) => item.serial_number), BATCH_SIZE)) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('serial_number')
      .in('serial_number', serialBatch);

    if (error) {
      throw new Error(`Existing serial lookup failed: ${error.message}`);
    }

    for (const row of data || []) {
      if (row.serial_number) existingSerials.add(row.serial_number);
    }
  }

  const newItems = items.filter((item) => !existingSerials.has(item.serial_number));

  console.log(`Existing serials already in DB: ${existingSerials.size}`);
  console.log(`New items to insert after DB check: ${newItems.length}`);

  for (const batch of chunk(newItems, BATCH_SIZE)) {
    const { error } = await supabase
      .from('inventory_items')
      .insert(batch);
    if (error) {
      throw new Error(`Item insert failed: ${error.message}`);
    }
  }

  console.log(`Inserted ${categories.length} categories and ${newItems.length} inventory items.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
