const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const POSSIBLE_WORKBOOK_PATHS = [
  path.resolve(process.cwd(), 'tmp', 'Take on Debtors ye 0226 -  receipts  0326.xlsx'),
  path.resolve(process.cwd(), 'app', 'Take on Debtors ye 0226 -  receipts  0326.xlsx'),
];
const WORKBOOK_PATH = POSSIBLE_WORKBOOK_PATHS.find((filePath) => fs.existsSync(filePath));
const SOURCE_WORKBOOK = 'Take on Debtors ye 0226 -  receipts  0326.xlsx';
const SOURCE_SHEET = 'March Receipts';
const BILLING_MONTH_APPLIED_TO = '2026-02-01';
const REPORT_PATH = path.resolve(process.cwd(), 'tmp', 'imported-account-payments-import-report.json');
const DETAIL_PATH = path.resolve(process.cwd(), 'tmp', 'imported-account-payments-import-detail.json');
const APPLY_MODE = process.argv.includes('--apply');

if (!WORKBOOK_PATH) {
  throw new Error('Workbook not found in tmp or app folder.');
}

function loadEnv(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return '';
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  return line ? line.split('=', 2)[1].trim().replace(/^'+|'+$/g, '') : '';
}

const supabaseUrl = loadEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = loadEnv('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase environment variables are required.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function toNumber(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value) {
  return Number(toNumber(value).toFixed(2));
}

function excelDateToIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parts = xlsx.SSF.parse_date_code(value);
    if (!parts) return null;
    return `${String(parts.y).padStart(4, '0')}-${String(parts.m).padStart(2, '0')}-${String(parts.d).padStart(2, '0')}`;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const [dd, mm, yyyy] = raw.split(/[/-]/);
  if (yyyy && mm && dd) {
    const iso = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    if (!Number.isNaN(iso.getTime())) return iso.toISOString().slice(0, 10);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function getSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
}

function parseReceiptsSheet(rows) {
  const headerIndex = rows.findIndex((row) => Array.isArray(row) && row.includes('ACCOUNT SOLFLO'));
  if (headerIndex === -1) {
    throw new Error(`Could not find ACCOUNT SOLFLO header in ${SOURCE_SHEET}`);
  }

  const receipts = [];
  let carry = { account_fusion: '', account_solflo: '', client_name: '' };

  rows
    .slice(headerIndex + 1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
    .forEach((row) => {
      const accountFusion = String(row[1] ?? '').trim();
      const accountSolflo = String(row[2] ?? '').trim();
      const clientName = String(row[3] ?? '').trim();
      if (accountFusion) carry.account_fusion = accountFusion;
      if (accountSolflo) carry.account_solflo = accountSolflo;
      if (clientName) carry.client_name = clientName;

      const amount = roundCurrency(row[31]);
      const paymentDate = excelDateToIsoDate(row[29]);
      if (!carry.account_solflo || !amount || !paymentDate) return;

      receipts.push({
        account_fusion: carry.account_fusion,
        account_number: carry.account_solflo,
        client_name: carry.client_name,
        payment_date: paymentDate,
        payer_name: String(row[30] ?? '').trim() || null,
        reference: String(row[30] ?? '').trim() || 'payment',
        amount,
        allocation_current_due: roundCurrency(row[32]),
        allocation_overdue_30_days: roundCurrency(row[33]),
        allocation_overdue_60_days: roundCurrency(row[34]),
        allocation_overdue_90_days: roundCurrency(row[35]),
        allocation_overdue_120_plus_days: roundCurrency(row[36]),
      });
    });

  return receipts.sort((a, b) => a.payment_date.localeCompare(b.payment_date) || a.account_number.localeCompare(b.account_number));
}

async function insertInBatches(rows, batchSize = 200) {
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const { error } = await supabase.from('imported_account_payments').insert(batch);
    if (error) throw error;
  }
}

function normalizeText(value) {
  return String(value ?? '').trim().toUpperCase();
}

function buildReceiptKey(row) {
  return [
    normalizeText(row.account_number),
    String(row.payment_date || '').trim(),
    roundCurrency(row.amount).toFixed(2),
  ].join('|');
}

function buildAllocationSignature(row) {
  return [
    roundCurrency(row.allocation_current_due).toFixed(2),
    roundCurrency(row.allocation_overdue_30_days).toFixed(2),
    roundCurrency(row.allocation_overdue_60_days).toFixed(2),
    roundCurrency(row.allocation_overdue_90_days).toFixed(2),
    roundCurrency(row.allocation_overdue_120_plus_days).toFixed(2),
  ].join('|');
}

async function fetchExistingImportedPayments() {
  const { data, error } = await supabase
    .from('imported_account_payments')
    .select(
      [
        'id',
        'account_number',
        'client_name',
        'source_workbook',
        'source_sheet',
        'payer_name',
        'reference',
        'payment_date',
        'amount',
        'allocation_current_due',
        'allocation_overdue_30_days',
        'allocation_overdue_60_days',
        'allocation_overdue_90_days',
        'allocation_overdue_120_plus_days',
        'billing_month_applied_to',
        'notes',
      ].join(','),
    )
    .eq('billing_month_applied_to', BILLING_MONTH_APPLIED_TO)
    .eq('source_sheet', SOURCE_SHEET);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function main() {
  const workbook = xlsx.readFile(WORKBOOK_PATH, { cellDates: true });
  const rows = getSheetRows(workbook, SOURCE_SHEET);
  const parsedReceipts = parseReceiptsSheet(rows);

  const payload = parsedReceipts.map((receipt) => ({
    account_number: receipt.account_number,
    client_name: receipt.client_name || null,
    source_workbook: SOURCE_WORKBOOK,
    source_sheet: SOURCE_SHEET,
    payer_name: receipt.payer_name,
    reference: receipt.reference,
    payment_date: receipt.payment_date,
    amount: receipt.amount,
    allocation_current_due: receipt.allocation_current_due,
    allocation_overdue_30_days: receipt.allocation_overdue_30_days,
    allocation_overdue_60_days: receipt.allocation_overdue_60_days,
    allocation_overdue_90_days: receipt.allocation_overdue_90_days,
    allocation_overdue_120_plus_days: receipt.allocation_overdue_120_plus_days,
    billing_month_applied_to: BILLING_MONTH_APPLIED_TO,
    notes: 'Imported from March Receipts sheet',
  }));

  const workbookTotal = roundCurrency(payload.reduce((sum, row) => sum + row.amount, 0));
  const allocationTotal = roundCurrency(payload.reduce((sum, row) => sum + row.allocation_current_due + row.allocation_overdue_30_days + row.allocation_overdue_60_days + row.allocation_overdue_90_days + row.allocation_overdue_120_plus_days, 0));
  const accounts = [...new Set(payload.map((row) => row.account_number))].sort();
  const existingRows = await fetchExistingImportedPayments();

  const existingByKey = new Map();
  existingRows.forEach((row) => {
    const key = buildReceiptKey(row);
    if (!existingByKey.has(key)) {
      existingByKey.set(key, []);
    }
    existingByKey.get(key).push(row);
  });

  const exactMatches = [];
  const missingRows = [];
  const conflictingRows = [];

  payload.forEach((row) => {
    const key = buildReceiptKey(row);
    const matches = existingByKey.get(key) || [];
    if (matches.length === 0) {
      missingRows.push(row);
      return;
    }

    const incomingSignature = buildAllocationSignature(row);
    const exact = matches.find((existingRow) => buildAllocationSignature(existingRow) === incomingSignature);

    if (exact) {
      exactMatches.push({
        workbook: row,
        existing: exact,
      });
      return;
    }

    conflictingRows.push({
      workbook: row,
      existing: matches,
    });
  });

  const summary = {
    workbook: SOURCE_WORKBOOK,
    sheet: SOURCE_SHEET,
    billing_month_applied_to: BILLING_MONTH_APPLIED_TO,
    workbook_path: WORKBOOK_PATH,
    mode: APPLY_MODE ? 'apply' : 'dry-run',
    receipt_row_count: payload.length,
    distinct_accounts: accounts.length,
    workbook_total_amount: workbookTotal,
    workbook_total_allocations: allocationTotal,
    existing_db_row_count: existingRows.length,
    exact_match_count: exactMatches.length,
    missing_count: missingRows.length,
    conflict_count: conflictingRows.length,
    missing_total_amount: roundCurrency(missingRows.reduce((sum, row) => sum + row.amount, 0)),
    conflict_total_amount: roundCurrency(conflictingRows.reduce((sum, row) => sum + row.workbook.amount, 0)),
    exact_match_total_amount: roundCurrency(exactMatches.reduce((sum, row) => sum + row.workbook.amount, 0)),
    sample_missing: missingRows.slice(0, 20),
    sample_conflicts: conflictingRows.slice(0, 20),
  };

  if (APPLY_MODE) {
    await insertInBatches(missingRows);

    const { data: insertedRows, error: selectError } = await supabase
      .from('imported_account_payments')
      .select('account_number, amount, payment_date')
      .eq('source_sheet', SOURCE_SHEET)
      .eq('billing_month_applied_to', BILLING_MONTH_APPLIED_TO);
    if (selectError) throw selectError;

    const dbTotal = roundCurrency((insertedRows || []).reduce((sum, row) => sum + toNumber(row.amount), 0));
    summary.db_row_count = insertedRows?.length || 0;
    summary.db_total_amount = dbTotal;
    summary.inserted_missing_rows = missingRows.length;
    summary.db_contains_all_workbook_rows = missingRows.length === 0 && conflictingRows.length === 0;
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    DETAIL_PATH,
    JSON.stringify(
      {
        workbook_rows: payload,
        exact_matches: exactMatches,
        missing_rows: missingRows,
        conflicting_rows: conflictingRows,
        existing_rows: existingRows,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
