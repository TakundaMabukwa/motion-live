const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const workbookPath = path.resolve(process.cwd(), "CLIENT SOLFLO ACCOUNT NUMBERS.xlsx");
const reportPath = path.resolve(process.cwd(), "tmp", "age-analysis-import-report.json");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase environment variables are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function normalize(value) {
  return String(value ?? "").trim().toUpperCase();
}

function toNumber(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCurrency(value) {
  const raw = String(value ?? "").trim().toUpperCase();
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
    const hour = String(parts.H || 0).padStart(2, "0");
    const minute = String(parts.M || 0).padStart(2, "0");
    const second = String(Math.floor(parts.S || 0)).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const normalizedRaw = raw.includes("/") ? raw.replace(/\//g, "-") : raw;
  const parsed = new Date(normalizedRaw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getWorkbookMeta(rows) {
  const titleCell = String(rows?.[0]?.[0] ?? "");
  const match = titleCell.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) {
    return {
      exportDate: new Date().toISOString(),
      billingMonth: new Date().toISOString().slice(0, 7) + "-01",
    };
  }

  const [_, dd, mm, yyyy] = match;
  const exportDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  return {
    exportDate: exportDate.toISOString(),
    billingMonth: `${yyyy}-${mm}-01`,
  };
}

function readWorkbook() {
  const wb = xlsx.readFile(workbookPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });
  const headerRowIndex = rows.findIndex(
    (row) => Array.isArray(row) && row.includes("ACCOUNT SOLFLO"),
  );

  if (headerRowIndex === -1) {
    throw new Error("Could not find the ACCOUNT SOLFLO header row.");
  }

  const headers = rows[headerRowIndex].map((value) =>
    value == null ? "" : String(value).trim(),
  );

  const workbookMeta = getWorkbookMeta(rows);

  const records = rows
    .slice(headerRowIndex + 1)
    .filter((row) => Array.isArray(row) && row.some((cell) => cell != null && String(cell).trim() !== ""))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header || `COL_${index}`] = row[index];
      });
      return record;
    })
    .map((record) => ({
      account_fusion: String(record["ACCOUNT FUSION"] ?? "").trim(),
      account_solflo: String(record["ACCOUNT SOLFLO"] ?? "").trim(),
      client_name: String(record["CLIENT"] ?? "").trim(),
      client_contact: String(record["CONTACT"] ?? "").trim(),
      phone: String(record["PHONE"] ?? "").trim(),
      email: String(record["EMAIL"] ?? "").trim(),
      account_status: String(record["ACCOUNT STATUS"] ?? "").trim(),
      payment_terms: String(record["PAYMENT TERMS"] ?? "").trim(),
      category: String(record["CATEGORY"] ?? "").trim(),
      postal_address: String(record["POSTAL ADDRESS"] ?? "").trim(),
      city: String(record["CITY"] ?? "").trim(),
      region: String(record["REGION"] ?? "").trim(),
      country: String(record["COUNTRY"] ?? "").trim(),
      post_code: String(record["POST CODE"] ?? "").trim(),
      solutions_rep: String(record["SOLUTIONS REP."] ?? "").trim(),
      last_payment_date: excelDateToIso(record["LAST PAYMENT DATE"]),
      last_payment: toNumber(record["LAST PAYMENT"]),
      avg_days_to_pay: toNumber(record["AVG. DAYS TO PAY"]),
      debtor_note: String(record["DEBTOR NOTE"] ?? "").trim(),
      credit_limit: toNumber(record["CREDIT LIMIT"]),
      currency: normalizeCurrency(record["CURRENCY"]),
      current_due: toNumber(record["CURRENT"]),
      overdue_30_days: toNumber(record["30 DAYS"]),
      overdue_60_days: toNumber(record["60 DAYS"]),
      overdue_90_days: toNumber(record["90 DAYS"]),
      overdue_120_plus_days: toNumber(record["120+ DAYS"]),
      outstanding_balance: toNumber(record["OUTSTANDING BALANCE"]),
      raw_row: record,
    }))
    .filter((record) => record.account_solflo);

  return { workbookMeta, records };
}

async function main() {
  const { workbookMeta, records } = readWorkbook();

  const { data: existingRows, error: existingError } = await supabase
    .from("payments_")
    .select("*");

  if (existingError) {
    throw existingError;
  }

  const byCostCode = new Map();
  for (const row of existingRows || []) {
    const key = normalize(row.cost_code);
    if (!byCostCode.has(key)) byCostCode.set(key, []);
    byCostCode.get(key).push(row);
  }

  const updates = [];
  const inserts = [];

  for (const record of records) {
    const matches = byCostCode.get(normalize(record.account_solflo)) || [];
    const payload = {
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
      last_payment_date: record.last_payment_date,
      last_payment: record.last_payment,
      avg_days_to_pay: record.avg_days_to_pay,
      debtor_note: record.debtor_note || null,
      credit_limit: record.credit_limit,
      currency: record.currency,
      current_due: record.current_due,
      overdue_30_days: record.overdue_30_days,
      overdue_60_days: record.overdue_60_days,
      overdue_90_days: record.overdue_90_days,
      overdue_120_plus_days: record.overdue_120_plus_days,
      outstanding_balance: record.outstanding_balance,
      due_amount: record.outstanding_balance,
      balance_due: record.outstanding_balance,
      paid_amount: 0,
      amount_excl_vat: record.outstanding_balance,
      vat_amount: 0,
      amount_incl_vat: record.outstanding_balance,
      payment_status: record.outstanding_balance > 0 ? "pending" : "paid",
      invoice_date: workbookMeta.exportDate,
      due_date: workbookMeta.exportDate.slice(0, 10),
      billing_month: workbookMeta.billingMonth,
      last_updated: workbookMeta.exportDate,
      reference: record.account_fusion || record.account_solflo,
      age_analysis_imported_at: new Date().toISOString(),
    };

    if (matches.length === 0) {
      inserts.push(payload);
      continue;
    }

    for (const match of matches) {
      updates.push({
        id: match.id,
        cost_code: match.cost_code,
        payload,
      });
    }
  }

  let updatedCount = 0;
  for (const update of updates) {
    const { error } = await supabase
      .from("payments_")
      .update(update.payload)
      .eq("id", update.id);
    if (error) throw error;
    updatedCount += 1;
  }

  let insertedCount = 0;
  if (inserts.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < inserts.length; i += chunkSize) {
      const chunk = inserts.slice(i, i + chunkSize);
      const { error } = await supabase.from("payments_").insert(chunk);
      if (error) throw error;
      insertedCount += chunk.length;
    }
  }

  const report = {
    workbookRows: records.length,
    updatedRows: updatedCount,
    insertedRows: insertedCount,
    billingMonthUsed: workbookMeta.billingMonth,
    exportDateUsed: workbookMeta.exportDate,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
