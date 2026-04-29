const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const WORKBOOK_CANDIDATES = [
  path.resolve(
    process.cwd(),
    "components",
    "inv",
    "components",
    "Take on Debtors ye 0226 -  receipts  0326 - update.xlsx",
  ),
  path.resolve(
    process.cwd(),
    "components",
    "inv",
    "components",
    "Take on Debtors ye 0226 -  receipts  0326.xlsx",
  ),
  path.resolve(
    process.cwd(),
    "tmp",
    "Take on Debtors ye 0226 -  receipts  0326.xlsx",
  ),
];
const WORKBOOK_PATH =
  WORKBOOK_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ||
  WORKBOOK_CANDIDATES[0];
const OPENING_SHEET = "Amended Debtors age anal";
const RECEIPTS_SHEET = "March Receipts";
const REPORT_DIR = path.resolve(process.cwd(), "tmp");
const SUMMARY_REPORT_PATH = path.join(REPORT_DIR, "amended-debtors-import-report.json");
const DETAIL_REPORT_PATH = path.join(REPORT_DIR, "amended-debtors-import-detail.json");

const OPENING_BILLING_MONTH = "2026-02-01";
function getOperationalBillingMonth(date = new Date()) {
  const operationalDate = new Date(date);
  if (operationalDate.getDate() <= 7) {
    operationalDate.setMonth(operationalDate.getMonth() - 1);
  }
  operationalDate.setDate(1);
  return `${operationalDate.getFullYear()}-${String(operationalDate.getMonth() + 1).padStart(2, "0")}-01`;
}
const CURRENT_BILLING_MONTH = "2026-03-01";

const ACCOUNT_SOLFLO_OVERRIDES = {
  MEK001: "MACS-0039",
  MACBRI: "MACS-0040",
  MACWADEVILLE: "MACS-0041",
};

function loadEnv(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return "";
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line ? line.split("=", 2)[1].trim() : "";
}

const supabaseUrl = loadEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = loadEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase environment variables are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const applyMode = process.argv.includes("--apply");
const accountPrefixArg = process.argv.find((arg) => arg.startsWith("--account-prefix="));
const accountPrefixFilter = accountPrefixArg
  ? normalize(accountPrefixArg.split("=", 2)[1])
  : "";

function normalize(value) {
  return String(value ?? "").trim().toUpperCase();
}

function resolveAccountSolflo(rawAccountSolflo, accountFusion, clientName) {
  const raw = String(rawAccountSolflo ?? "").trim();
  if (raw && raw.toLowerCase() !== "create") return raw;

  const fusionKey = normalize(accountFusion);
  if (fusionKey && ACCOUNT_SOLFLO_OVERRIDES[fusionKey]) {
    return ACCOUNT_SOLFLO_OVERRIDES[fusionKey];
  }

  const clientKey = normalize(clientName);
  if (clientKey && ACCOUNT_SOLFLO_OVERRIDES[clientKey]) {
    return ACCOUNT_SOLFLO_OVERRIDES[clientKey];
  }

  return "";
}

function toNumber(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value) {
  return Number(toNumber(value).toFixed(2));
}

function matchesAccountPrefix(value) {
  if (!accountPrefixFilter) return true;
  return normalize(value).startsWith(accountPrefixFilter);
}

function normalizeCurrency(value) {
  const raw = normalize(value);
  if (!raw || raw === "R") return "ZAR";
  return raw;
}

function excelDateToIso(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "number") {
    const parts = xlsx.SSF.parse_date_code(value);
    if (!parts) return null;
    const year = String(parts.y).padStart(4, "0");
    const month = String(parts.m).padStart(2, "0");
    const day = String(parts.d).padStart(2, "0");
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const [dd, mm, yyyy] = raw.split(/[/-]/);
  if (yyyy && mm && dd) {
    const iso = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    if (!Number.isNaN(iso.getTime())) {
      return iso.toISOString();
    }
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function getSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
}

function parseOpeningSheet(rows) {
  const headerIndex = rows.findIndex((row) => Array.isArray(row) && row.includes("ACCOUNT SOLFLO"));
  if (headerIndex === -1) {
    throw new Error(`Could not find ACCOUNT SOLFLO header in ${OPENING_SHEET}`);
  }

  return rows
    .slice(headerIndex + 1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => {
      const accountFusion = String(row[1] ?? "").trim();
      const clientName = String(row[3] ?? "").trim();
      return {
      account_fusion: accountFusion,
      account_solflo: resolveAccountSolflo(row[2], accountFusion, clientName),
      client_name: clientName,
      client_contact: String(row[4] ?? "").trim(),
      phone: String(row[5] ?? "").trim(),
      email: String(row[6] ?? "").trim(),
      account_status: String(row[7] ?? "").trim(),
      payment_terms: String(row[8] ?? "").trim(),
      category: String(row[9] ?? "").trim(),
      postal_address: String(row[10] ?? "").trim(),
      city: String(row[11] ?? "").trim(),
      region: String(row[12] ?? "").trim(),
      country: String(row[13] ?? "").trim(),
      post_code: String(row[14] ?? "").trim(),
      solutions_rep: String(row[15] ?? "").trim(),
      last_payment_date: excelDateToIso(row[16]),
      last_payment: roundCurrency(row[17]),
      avg_days_to_pay: roundCurrency(row[18]),
      debtor_note: String(row[19] ?? "").trim(),
      credit_limit: roundCurrency(row[20]),
      currency: normalizeCurrency(row[21]),
      current_due: roundCurrency(row[22]),
      overdue_30_days: roundCurrency(row[23]),
      overdue_60_days: roundCurrency(row[24]),
      overdue_90_days: roundCurrency(row[25]),
      overdue_120_plus_days: roundCurrency(row[26]),
      outstanding_balance: roundCurrency(row[27]),
    };
    })
    .filter((row) => row.account_solflo);
}

function parseReceiptsSheet(rows) {
  const headerIndex = rows.findIndex((row) => Array.isArray(row) && row.includes("ACCOUNT SOLFLO"));
  if (headerIndex === -1) {
    throw new Error(`Could not find ACCOUNT SOLFLO header in ${RECEIPTS_SHEET}`);
  }

  const receipts = [];
  let carry = {
    account_fusion: "",
    account_solflo: "",
    client_name: "",
  };

  rows
    .slice(headerIndex + 1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? "").trim() !== ""))
    .forEach((row) => {
      const accountFusion = String(row[1] ?? "").trim();
      const clientName = String(row[3] ?? "").trim();
      const accountSolflo = resolveAccountSolflo(row[2], accountFusion, clientName);
      if (accountFusion) carry.account_fusion = accountFusion;
      if (accountSolflo) carry.account_solflo = accountSolflo;
      if (clientName) carry.client_name = clientName;

      const amount = roundCurrency(row[31]);
      const dateIso = excelDateToIso(row[29]);
      if (!carry.account_solflo || !amount || !dateIso) {
        return;
      }

      receipts.push({
        account_fusion: carry.account_fusion,
        account_solflo: carry.account_solflo,
        client_name: carry.client_name,
        payment_date: dateIso,
        payer_name: String(row[30] ?? "").trim(),
        amount,
        allocations: {
          current_due: roundCurrency(row[32]),
          overdue_30_days: roundCurrency(row[33]),
          overdue_60_days: roundCurrency(row[34]),
          overdue_90_days: roundCurrency(row[35]),
          overdue_120_plus_days: roundCurrency(row[36]),
        },
      });
    });

  return receipts.sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime(),
  );
}

function hasExplicitAllocation(receipt) {
  return (
    receipt.allocations.current_due > 0 ||
    receipt.allocations.overdue_30_days > 0 ||
    receipt.allocations.overdue_60_days > 0 ||
    receipt.allocations.overdue_90_days > 0 ||
    receipt.allocations.overdue_120_plus_days > 0
  );
}

function cloneBuckets(buckets) {
  return {
    current_due: roundCurrency(buckets.current_due),
    overdue_30_days: roundCurrency(buckets.overdue_30_days),
    overdue_60_days: roundCurrency(buckets.overdue_60_days),
    overdue_90_days: roundCurrency(buckets.overdue_90_days),
    overdue_120_plus_days: roundCurrency(buckets.overdue_120_plus_days),
  };
}

function totalBuckets(buckets) {
  return roundCurrency(
    buckets.current_due +
      buckets.overdue_30_days +
      buckets.overdue_60_days +
      buckets.overdue_90_days +
      buckets.overdue_120_plus_days,
  );
}

function applyReceiptToBuckets(startBuckets, receipt) {
  const buckets = cloneBuckets(startBuckets);
  let remaining = roundCurrency(receipt.amount);
  const applied = {
    current_due: 0,
    overdue_30_days: 0,
    overdue_60_days: 0,
    overdue_90_days: 0,
    overdue_120_plus_days: 0,
  };

  const consumeSpecific = (key, requestedAmount) => {
    if (remaining <= 0 || requestedAmount <= 0) return;
    const appliedAmount = Math.min(remaining, requestedAmount, buckets[key]);
    buckets[key] = roundCurrency(buckets[key] - appliedAmount);
    applied[key] = roundCurrency(applied[key] + appliedAmount);
    remaining = roundCurrency(remaining - appliedAmount);
  };

  if (hasExplicitAllocation(receipt)) {
    consumeSpecific("current_due", receipt.allocations.current_due);
    consumeSpecific("overdue_30_days", receipt.allocations.overdue_30_days);
    consumeSpecific("overdue_60_days", receipt.allocations.overdue_60_days);
    consumeSpecific("overdue_90_days", receipt.allocations.overdue_90_days);
    consumeSpecific("overdue_120_plus_days", receipt.allocations.overdue_120_plus_days);
  }

  const fallbackOrder = [
    "overdue_120_plus_days",
    "overdue_90_days",
    "overdue_60_days",
    "overdue_30_days",
    "current_due",
  ];

  fallbackOrder.forEach((key) => {
    if (remaining <= 0) return;
    const appliedAmount = Math.min(remaining, buckets[key]);
    buckets[key] = roundCurrency(buckets[key] - appliedAmount);
    applied[key] = roundCurrency(applied[key] + appliedAmount);
    remaining = roundCurrency(remaining - appliedAmount);
  });

  return {
    buckets,
    applied,
    appliedAmount: roundCurrency(receipt.amount - remaining),
    creditAmount: roundCurrency(remaining),
    usedExplicitAllocation: hasExplicitAllocation(receipt),
  };
}

function rollOpeningBucketsForwardOneMonth(buckets) {
  return {
    overdue_30_days: roundCurrency(buckets.current_due),
    overdue_60_days: roundCurrency(buckets.overdue_30_days),
    overdue_90_days: roundCurrency(buckets.overdue_60_days),
    overdue_120_plus_days: roundCurrency(buckets.overdue_90_days + buckets.overdue_120_plus_days),
  };
}

function buildOpeningPayload(record, residualBuckets, receiptSummary, nowIso) {
  const residualOutstanding = totalBuckets(residualBuckets);
  return {
    company: record.client_name || null,
    cost_code: record.account_solflo,
    account_fusion: record.account_fusion || null,
    account_solflo: record.account_solflo,
    client_name: record.client_name || null,
    client_contact: record.client_contact || null,
    phone: record.phone || null,
    email: record.email || null,
    account_status: record.account_status || null,
    payment_terms: record.payment_terms || null,
    category: record.category || null,
    postal_address: record.postal_address || null,
    city: record.city || null,
    region: record.region || null,
    country: record.country || null,
    post_code: record.post_code || null,
    solutions_rep: record.solutions_rep || null,
    last_payment_date: receiptSummary.latestPaymentDate || record.last_payment_date,
    last_payment: receiptSummary.latestPaymentAmount || record.last_payment,
    avg_days_to_pay: record.avg_days_to_pay,
    debtor_note: record.debtor_note || null,
    credit_limit: record.credit_limit,
    currency: record.currency,
    due_amount: record.outstanding_balance,
    paid_amount: receiptSummary.totalApplied,
    balance_due: residualOutstanding,
    current_due: residualBuckets.current_due,
    overdue_30_days: residualBuckets.overdue_30_days,
    overdue_60_days: residualBuckets.overdue_60_days,
    overdue_90_days: residualBuckets.overdue_90_days,
    overdue_120_plus_days: residualBuckets.overdue_120_plus_days,
    outstanding_balance: residualOutstanding,
    amount_due: residualOutstanding,
    credit_amount: receiptSummary.totalCredits,
    payment_status: residualOutstanding > 0 ? "pending" : "paid",
    invoice_date: `${OPENING_BILLING_MONTH}T00:00:00.000Z`,
    due_date: OPENING_BILLING_MONTH,
    billing_month: OPENING_BILLING_MONTH,
    reference: record.account_fusion || record.account_solflo,
    last_updated: nowIso,
    age_analysis_imported_at: nowIso,
  };
}

function applyCreditToBuckets(startBuckets, creditAmount) {
  const buckets = cloneBuckets(startBuckets);
  let remainingCredit = roundCurrency(creditAmount);

  const consume = (key) => {
    if (remainingCredit <= 0) return;
    const available = roundCurrency(buckets[key]);
    if (available <= 0) return;
    const appliedAmount = Math.min(available, remainingCredit);
    buckets[key] = roundCurrency(available - appliedAmount);
    remainingCredit = roundCurrency(remainingCredit - appliedAmount);
  };

  [
    "current_due",
    "overdue_30_days",
    "overdue_60_days",
    "overdue_90_days",
    "overdue_120_plus_days",
  ].forEach(consume);

  return {
    buckets,
    remainingCredit,
    appliedAmount: roundCurrency(creditAmount - remainingCredit),
  };
}

function buildCurrentPayload({
  record,
  currentSource,
  rolledBuckets,
  totalCredits,
  receiptSummary,
  nowIso,
}) {
  const grossCurrentDue = roundCurrency(
    currentSource?.current_due ??
      currentSource?.balance_due ??
      currentSource?.due_amount ??
      0,
  );
  const grossBuckets = {
    current_due: grossCurrentDue,
    overdue_30_days: roundCurrency(rolledBuckets.overdue_30_days),
    overdue_60_days: roundCurrency(rolledBuckets.overdue_60_days),
    overdue_90_days: roundCurrency(rolledBuckets.overdue_90_days),
    overdue_120_plus_days: roundCurrency(rolledBuckets.overdue_120_plus_days),
  };
  const carryForwardCredit = roundCurrency((currentSource?.credit_amount || 0) + totalCredits);
  const creditedBuckets = applyCreditToBuckets(grossBuckets, carryForwardCredit);
  const outstandingBalance = totalBuckets(creditedBuckets.buckets);

  return {
    company: currentSource?.company || record.client_name || null,
    cost_code: record.account_solflo,
    account_invoice_id: currentSource?.account_invoice_id || null,
    invoice_number: currentSource?.invoice_number || null,
    reference:
      currentSource?.reference ||
      currentSource?.invoice_number ||
      record.account_fusion ||
      record.account_solflo,
    account_fusion: record.account_fusion || currentSource?.account_fusion || null,
    account_solflo: record.account_solflo,
    client_name: record.client_name || currentSource?.client_name || null,
    client_contact: record.client_contact || currentSource?.client_contact || null,
    phone: record.phone || currentSource?.phone || null,
    email: record.email || currentSource?.email || null,
    account_status: record.account_status || currentSource?.account_status || null,
    payment_terms: record.payment_terms || currentSource?.payment_terms || null,
    category: record.category || currentSource?.category || null,
    postal_address: record.postal_address || currentSource?.postal_address || null,
    city: record.city || currentSource?.city || null,
    region: record.region || currentSource?.region || null,
    country: record.country || currentSource?.country || null,
    post_code: record.post_code || currentSource?.post_code || null,
    solutions_rep: record.solutions_rep || currentSource?.solutions_rep || null,
    last_payment_date: receiptSummary.latestPaymentDate || currentSource?.last_payment_date || null,
    last_payment: receiptSummary.latestPaymentAmount || currentSource?.last_payment || 0,
    avg_days_to_pay: record.avg_days_to_pay || currentSource?.avg_days_to_pay || 0,
    debtor_note: record.debtor_note || currentSource?.debtor_note || null,
    credit_limit: record.credit_limit || currentSource?.credit_limit || 0,
    currency: record.currency || currentSource?.currency || "ZAR",
    due_amount: roundCurrency(currentSource?.due_amount || 0),
    paid_amount: roundCurrency(currentSource?.paid_amount || 0),
    balance_due: outstandingBalance,
    current_due: creditedBuckets.buckets.current_due,
    overdue_30_days: creditedBuckets.buckets.overdue_30_days,
    overdue_60_days: creditedBuckets.buckets.overdue_60_days,
    overdue_90_days: creditedBuckets.buckets.overdue_90_days,
    overdue_120_plus_days: creditedBuckets.buckets.overdue_120_plus_days,
    outstanding_balance: outstandingBalance,
    amount_due: outstandingBalance,
    credit_amount: creditedBuckets.remainingCredit,
    payment_status:
      outstandingBalance > 0 ? currentSource?.payment_status || "pending" : "paid",
    invoice_date: currentSource?.invoice_date || `${CURRENT_BILLING_MONTH}T00:00:00.000Z`,
    due_date: currentSource?.due_date || CURRENT_BILLING_MONTH,
    billing_month: CURRENT_BILLING_MONTH,
    last_updated: nowIso,
    age_analysis_imported_at: nowIso,
  };
}

async function fetchRows(tableName, accountNumbers, columns) {
  const chunkSize = 100;
  const rows = [];
  for (let i = 0; i < accountNumbers.length; i += chunkSize) {
    const chunk = accountNumbers.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(tableName).select(columns).in(
      tableName === "bulk_account_invoices" ? "account_number" : "cost_code",
      chunk,
    );
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

async function ensureCostCenters(records) {
  const uniqueRecords = Array.from(
    new Map(
      records
        .filter((record) => record.account_solflo)
        .map((record) => [
          normalize(record.account_solflo),
          {
            cost_code: record.account_solflo,
            company: record.client_name || null,
            legal_name: record.client_name || null,
          },
        ]),
    ).values(),
  );

  if (uniqueRecords.length === 0) return { inserted: 0 };

  const existing = await fetchRows(
    "cost_centers",
    uniqueRecords.map((record) => record.cost_code),
    "cost_code",
  );

  const existingCodes = new Set(existing.map((row) => normalize(row.cost_code)));
  const missing = uniqueRecords.filter((record) => !existingCodes.has(normalize(record.cost_code)));

  if (missing.length === 0) return { inserted: 0 };
  if (!applyMode) return { inserted: missing.length, dryRun: true };

  const chunkSize = 100;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize).map((record) => ({
      company: record.company,
      legal_name: record.legal_name,
      cost_code: record.cost_code,
      validated: false,
    }));
    const { error } = await supabase.from("cost_centers").insert(chunk);
    if (error) throw error;
  }

  return { inserted: missing.length };
}

async function ensureMacsteelGroup(codes) {
  const normalizedCodes = Array.from(
    new Set(
      codes
        .map((code) => String(code || "").trim())
        .filter((code) => /^MACS-\d{4}$/i.test(code)),
    ),
  );

  if (normalizedCodes.length === 0) return { appended: 0 };

  const { data: existingGroup, error } = await supabase
    .from("customers_grouped")
    .select("id, all_new_account_numbers")
    .eq("company_group", "MACSTEEL")
    .maybeSingle();

  if (error) throw error;
  if (!existingGroup) return { appended: 0, missingGroup: true };

  const existingCodes = String(existingGroup.all_new_account_numbers || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const existingSet = new Set(existingCodes.map((code) => normalize(code)));
  const toAppend = normalizedCodes.filter((code) => !existingSet.has(normalize(code)));

  if (toAppend.length === 0) return { appended: 0 };
  if (!applyMode) return { appended: toAppend.length, dryRun: true };

  const updatedCodes = [...existingCodes, ...toAppend].join(",");
  const { error: updateError } = await supabase
    .from("customers_grouped")
    .update({ all_new_account_numbers: updatedCodes })
    .eq("id", existingGroup.id);

  if (updateError) throw updateError;
  return { appended: toAppend.length };
}

async function main() {
  const workbook = xlsx.readFile(WORKBOOK_PATH);
  const openingRecords = parseOpeningSheet(getSheetRows(workbook, OPENING_SHEET)).filter((record) =>
    matchesAccountPrefix(record.account_solflo),
  );
  const receipts = parseReceiptsSheet(getSheetRows(workbook, RECEIPTS_SHEET)).filter((receipt) =>
    matchesAccountPrefix(receipt.account_solflo),
  );
  const receiptMap = new Map();
  receipts.forEach((receipt) => {
    const key = normalize(receipt.account_solflo);
    if (!receiptMap.has(key)) receiptMap.set(key, []);
    receiptMap.get(key).push(receipt);
  });

  const accountNumbers = Array.from(
    new Set(openingRecords.map((record) => normalize(record.account_solflo)).filter(Boolean)),
  );

  const [paymentRows, bulkInvoices] = await Promise.all([
    fetchRows(
      "payments_",
      accountNumbers,
      [
        "id",
        "company",
        "cost_code",
        "account_invoice_id",
        "invoice_number",
        "reference",
        "due_amount",
        "paid_amount",
        "balance_due",
        "current_due",
        "credit_amount",
        "invoice_date",
        "due_date",
        "payment_status",
        "overdue_30_days",
        "overdue_60_days",
        "overdue_90_days",
        "overdue_120_plus_days",
        "outstanding_balance",
        "billing_month",
        "last_updated",
        "account_fusion",
        "account_solflo",
        "client_name",
        "client_contact",
        "phone",
        "email",
        "account_status",
        "payment_terms",
        "category",
        "postal_address",
        "city",
        "region",
        "country",
        "post_code",
        "solutions_rep",
        "last_payment_date",
        "last_payment",
        "avg_days_to_pay",
        "debtor_note",
        "credit_limit",
        "currency",
      ].join(","),
    ),
    fetchRows(
      "bulk_account_invoices",
      accountNumbers,
      "id, account_number, billing_month, invoice_number, invoice_date, total_amount, company_name, client_address, customer_vat_number, created_at",
    ),
  ]);

  const paymentRowsByCode = new Map();
  paymentRows.forEach((row) => {
    const key = normalize(row.cost_code);
    if (!paymentRowsByCode.has(key)) paymentRowsByCode.set(key, []);
    paymentRowsByCode.get(key).push(row);
  });
  paymentRowsByCode.forEach((rows) => {
    rows.sort((a, b) => {
      const monthDiff = String(a.billing_month || "").localeCompare(String(b.billing_month || ""));
      if (monthDiff !== 0) return monthDiff;
      return String(a.last_updated || "").localeCompare(String(b.last_updated || ""));
    });
  });

  const bulkInvoicesByCode = new Map();
  bulkInvoices.forEach((row) => {
    const key = normalize(row.account_number);
    if (!bulkInvoicesByCode.has(key)) bulkInvoicesByCode.set(key, []);
    bulkInvoicesByCode.get(key).push(row);
  });
  bulkInvoicesByCode.forEach((rows) => {
    rows.sort((a, b) => String(a.billing_month || "").localeCompare(String(b.billing_month || "")));
  });

  const nowIso = new Date().toISOString();
  const overriddenRecords = openingRecords.filter((record) =>
    Object.values(ACCOUNT_SOLFLO_OVERRIDES).includes(record.account_solflo),
  );
  const summary = {
    workbook: path.basename(WORKBOOK_PATH),
    openingSheet: OPENING_SHEET,
    receiptsSheet: RECEIPTS_SHEET,
    openingBillingMonth: OPENING_BILLING_MONTH,
    currentBillingMonth: CURRENT_BILLING_MONTH,
    codeOverrides: ACCOUNT_SOLFLO_OVERRIDES,
    workbookAccountCount: openingRecords.length,
    receiptCount: receipts.length,
    accountPrefixFilter: accountPrefixFilter || null,
    insertedCostCenters: 0,
    appendedMacsteelCodes: 0,
    updatedOpeningRows: 0,
    insertedOpeningRows: 0,
    updatedCurrentRows: 0,
    insertedCurrentRows: 0,
    totalReceiptsApplied: 0,
    totalReceiptCredits: 0,
    totalCurrentDueAfterImport: 0,
    totalOutstandingAfterImport: 0,
    mode: applyMode ? "apply" : "dry-run",
    overriddenAccounts: overriddenRecords.map((record) => ({
      account_fusion: record.account_fusion,
      account_solflo: record.account_solflo,
      client_name: record.client_name,
      outstanding_balance: record.outstanding_balance,
    })),
  };
  const detail = [];

  const costCenterSync = await ensureCostCenters(overriddenRecords);
  const macsteelGroupSync = await ensureMacsteelGroup(
    overriddenRecords.map((record) => record.account_solflo),
  );
  summary.insertedCostCenters = costCenterSync.inserted || 0;
  summary.appendedMacsteelCodes = macsteelGroupSync.appended || 0;

  for (const record of openingRecords) {
    const code = normalize(record.account_solflo);
    const rowHistory = paymentRowsByCode.get(code) || [];
    const openingRow =
      rowHistory.find((row) => String(row.billing_month || "") === OPENING_BILLING_MONTH) || null;
    const currentRow =
      rowHistory.find((row) => String(row.billing_month || "") === CURRENT_BILLING_MONTH) || null;
    const latestBulkInvoiceForCurrentMonth =
      (bulkInvoicesByCode.get(code) || []).find(
        (row) => String(row.billing_month || "") === CURRENT_BILLING_MONTH,
      ) || null;

    const startingBuckets = {
      current_due: record.current_due,
      overdue_30_days: record.overdue_30_days,
      overdue_60_days: record.overdue_60_days,
      overdue_90_days: record.overdue_90_days,
      overdue_120_plus_days: record.overdue_120_plus_days,
    };

    let residualBuckets = cloneBuckets(startingBuckets);
    let totalApplied = 0;
    let totalCredits = 0;
    let latestPaymentDate = null;
    let latestPaymentAmount = 0;
    const receiptResults = [];

    for (const receipt of receiptMap.get(code) || []) {
      const result = applyReceiptToBuckets(residualBuckets, receipt);
      residualBuckets = result.buckets;
      totalApplied = roundCurrency(totalApplied + result.appliedAmount);
      totalCredits = roundCurrency(totalCredits + result.creditAmount);
      latestPaymentDate = receipt.payment_date;
      latestPaymentAmount = receipt.amount;
      receiptResults.push({
        payment_date: receipt.payment_date,
        amount: receipt.amount,
        applied: result.applied,
        appliedAmount: result.appliedAmount,
        creditAmount: result.creditAmount,
        usedExplicitAllocation: result.usedExplicitAllocation,
      });
    }

    const rolledBuckets = rollOpeningBucketsForwardOneMonth(residualBuckets);
    const currentSource = currentRow || (
      latestBulkInvoiceForCurrentMonth
        ? {
            company: latestBulkInvoiceForCurrentMonth.company_name || record.client_name || null,
            invoice_number: latestBulkInvoiceForCurrentMonth.invoice_number || null,
            reference: latestBulkInvoiceForCurrentMonth.invoice_number || null,
            due_amount: latestBulkInvoiceForCurrentMonth.total_amount || 0,
            paid_amount: 0,
            balance_due: latestBulkInvoiceForCurrentMonth.total_amount || 0,
            current_due: latestBulkInvoiceForCurrentMonth.total_amount || 0,
            invoice_date: latestBulkInvoiceForCurrentMonth.invoice_date || latestBulkInvoiceForCurrentMonth.created_at,
            due_date: CURRENT_BILLING_MONTH,
            payment_status: (latestBulkInvoiceForCurrentMonth.total_amount || 0) > 0 ? "pending" : "paid",
            credit_amount: 0,
          }
        : null
    );

    const openingPayload = buildOpeningPayload(
      record,
      residualBuckets,
      {
        totalApplied,
        totalCredits,
        latestPaymentDate,
        latestPaymentAmount,
      },
      nowIso,
    );

    const currentPayload = buildCurrentPayload({
      record,
      currentSource,
      rolledBuckets,
      totalCredits,
      receiptSummary: {
        latestPaymentDate,
        latestPaymentAmount,
      },
      nowIso,
    });

    detail.push({
      cost_code: record.account_solflo,
      client_name: record.client_name,
      opening_row_id: openingRow?.id || null,
      current_row_id: currentRow?.id || null,
      opening_before: {
        ...startingBuckets,
        outstanding_balance: record.outstanding_balance,
      },
      receipts: receiptResults,
      opening_after: openingPayload,
      current_after: currentPayload,
    });

    summary.totalReceiptsApplied = roundCurrency(summary.totalReceiptsApplied + totalApplied);
    summary.totalReceiptCredits = roundCurrency(summary.totalReceiptCredits + totalCredits);
    summary.totalCurrentDueAfterImport = roundCurrency(
      summary.totalCurrentDueAfterImport + currentPayload.current_due,
    );
    summary.totalOutstandingAfterImport = roundCurrency(
      summary.totalOutstandingAfterImport + currentPayload.outstanding_balance,
    );

    if (!applyMode) {
      summary[openingRow ? "updatedOpeningRows" : "insertedOpeningRows"] += 1;
      summary[currentRow ? "updatedCurrentRows" : "insertedCurrentRows"] += 1;
      continue;
    }

    if (openingRow) {
      const { error } = await supabase.from("payments_").update(openingPayload).eq("id", openingRow.id);
      if (error) throw error;
      summary.updatedOpeningRows += 1;
    } else {
      const { error } = await supabase.from("payments_").insert(openingPayload);
      if (error) throw error;
      summary.insertedOpeningRows += 1;
    }

    if (currentRow) {
      const { error } = await supabase.from("payments_").update(currentPayload).eq("id", currentRow.id);
      if (error) throw error;
      summary.updatedCurrentRows += 1;
    } else {
      const { error } = await supabase.from("payments_").insert(currentPayload);
      if (error) throw error;
      summary.insertedCurrentRows += 1;
    }
  }

  ensureDir(SUMMARY_REPORT_PATH);
  fs.writeFileSync(SUMMARY_REPORT_PATH, JSON.stringify(summary, null, 2));
  fs.writeFileSync(DETAIL_REPORT_PATH, JSON.stringify(detail, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
