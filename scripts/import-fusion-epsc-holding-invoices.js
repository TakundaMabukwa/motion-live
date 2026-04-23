const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const ROOT = process.cwd();
const WORKBOOK_PATH = path.join(ROOT, "components", "accounts", "fusion inv's.xlsx");
const REPORT_PATH = path.join(ROOT, "tmp", "fusion-epsc-holding-import-report.json");
const TARGET_ACCOUNT_NUMBER = "EPSC-0001";
const SOURCE_ACCOUNT_NUMBERS = new Set(["EPS002", "EPS004"]);

const parseEnvFile = (filePath) =>
  Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^'+|'+$/g, "").replace(/^"+|"+$/g, "")];
      }),
  );

const normalize = (value) => String(value || "").trim();

const toNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const normalizeBillingMonth = (value) => {
  const iso = normalizeDate(value);
  if (!iso) return null;
  return `${iso.slice(0, 7)}-01`;
};

const addDays = (isoDate, days) => {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
};

const buildLineItems = (row) => {
  const jobLabel = normalize(row["JOB"]);
  const notes = normalize(row["NOTES"]);
  const description = jobLabel || notes || "Fusion imported invoice";

  return [
    {
      line_order: 1,
      source_type: "fusion_import",
      source_account_number: normalize(row["ACCOUNT NO."]),
      source_document_number: normalize(row["DOCUMENT NO."]),
      job_number: normalize(row["JOB NUMBER"]),
      item_code: "Fusion Import",
      description,
      comments: notes || description,
      quantity: 1,
      units: 1,
      unit_price_without_vat: toNumber(row["TOTAL EX. VAT"]),
      unit_price: toNumber(row["TOTAL EX. VAT"]),
      total_excl_vat: toNumber(row["TOTAL EX. VAT"]),
      vat_amount: toNumber(row["TOTAL VAT"]),
      total_including_vat: toNumber(row["TOTAL INCL. VAT"]),
      total_incl_vat: toNumber(row["TOTAL INCL. VAT"]),
    },
  ];
};

async function main() {
  const apply = process.argv.includes("--apply");
  const env = parseEnvFile(path.join(ROOT, ".env.local"));
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const workbook = XLSX.readFile(WORKBOOK_PATH, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { range: 6, defval: null });

  const filteredRows = rows.filter((row) => {
    const accountNumber = normalize(row["ACCOUNT NO."]).toUpperCase();
    const documentType = normalize(row["DOCUMENT TYPE"]).toUpperCase();
    return SOURCE_ACCOUNT_NUMBERS.has(accountNumber) && documentType === "INVOICE";
  });

  const invoiceNumbers = filteredRows
    .map((row) => normalize(row["DOCUMENT NO."]))
    .filter(Boolean);

  const [
    { data: existingInvoices, error: existingInvoicesError },
    { data: targetCostCenter, error: costCenterError },
  ] = await Promise.all([
    supabase
      .from("account_invoices")
      .select("id, invoice_number")
      .in("invoice_number", invoiceNumbers),
    supabase
      .from("cost_centers")
      .select("cost_code, company, legal_name, registration_number, vat_number, postal_address_1, postal_address_2, postal_address_3")
      .eq("cost_code", TARGET_ACCOUNT_NUMBER)
      .maybeSingle(),
  ]);

  if (existingInvoicesError) throw existingInvoicesError;
  if (costCenterError) throw costCenterError;
  if (!targetCostCenter) {
    throw new Error(`Target cost center ${TARGET_ACCOUNT_NUMBER} not found`);
  }

  const existingInvoiceNumbers = new Set(
    (Array.isArray(existingInvoices) ? existingInvoices : [])
      .map((row) => normalize(row?.invoice_number)),
  );

  const payloads = filteredRows.map((row) => {
    const invoiceNumber = normalize(row["DOCUMENT NO."]);
    const invoiceDate = normalizeDate(row["DOCUMENT DATE"]) || normalizeDate(row["DATE CREATED"]);
    const billingMonth = normalizeBillingMonth(row["DOCUMENT DATE"]) || normalizeBillingMonth(row["DATE CREATED"]);
    const sourceAccountNumber = normalize(row["ACCOUNT NO."]).toUpperCase();
    const holdingCompany = normalize(row["HOLDING COMPANY"]);
    const clientName = normalize(row["CLIENT NAME"]);
    const notes = normalize(row["NOTES"]);
    const jobNumber = normalize(row["JOB NUMBER"]);
    const jobLabel = normalize(row["JOB"]);

    const address = [
      normalize(targetCostCenter.postal_address_1),
      normalize(targetCostCenter.postal_address_2),
      normalize(targetCostCenter.postal_address_3),
    ]
      .filter(Boolean)
      .join(", ");

    return {
      account_number: TARGET_ACCOUNT_NUMBER,
      billing_month: billingMonth,
      invoice_number: invoiceNumber,
      company_name: normalize(targetCostCenter.company) || holdingCompany || clientName || TARGET_ACCOUNT_NUMBER,
      company_registration_number: normalize(targetCostCenter.registration_number) || null,
      client_address: address || null,
      customer_vat_number: normalize(targetCostCenter.vat_number) || null,
      invoice_date: invoiceDate,
      due_date: addDays(invoiceDate, 30),
      subtotal: toNumber(row["TOTAL EX. VAT"]),
      vat_amount: toNumber(row["TOTAL VAT"]),
      discount_amount: 0,
      total_amount: toNumber(row["TOTAL INCL. VAT"]),
      paid_amount: 0,
      balance_due: toNumber(row["TOTAL INCL. VAT"]),
      payment_status: "pending",
      line_items: buildLineItems(row),
      notes: [
        "Imported from components/accounts/fusion inv's.xlsx",
        `Fusion account ${sourceAccountNumber}`,
        jobNumber ? `Job ${jobNumber}` : "",
        jobLabel || notes,
      ]
        .filter(Boolean)
        .join(" | "),
      source_document_number: invoiceNumber,
      source_account_number: sourceAccountNumber,
      source_client_name: clientName,
      exists: existingInvoiceNumbers.has(invoiceNumber),
    };
  });

  const toInsert = payloads.filter((payload) => !payload.exists);

  const report = {
    workbookPath: WORKBOOK_PATH,
    generatedAt: new Date().toISOString(),
    targetAccountNumber: TARGET_ACCOUNT_NUMBER,
    sourceAccountNumbers: Array.from(SOURCE_ACCOUNT_NUMBERS),
    totalRowsMatched: filteredRows.length,
    existingCount: payloads.length - toInsert.length,
    toInsertCount: toInsert.length,
    invoices: payloads.map((payload) => ({
      invoice_number: payload.invoice_number,
      source_account_number: payload.source_account_number,
      billing_month: payload.billing_month,
      invoice_date: payload.invoice_date,
      total_amount: payload.total_amount,
      exists: payload.exists,
    })),
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  if (!apply) {
    console.log(`Dry run report written to ${REPORT_PATH}`);
    console.log(JSON.stringify({
      totalRowsMatched: report.totalRowsMatched,
      existingCount: report.existingCount,
      toInsertCount: report.toInsertCount,
    }, null, 2));
    return;
  }

  if (toInsert.length === 0) {
    console.log("No new invoices to insert.");
    return;
  }

  const insertPayload = toInsert.map(({ exists, source_document_number, source_account_number, source_client_name, ...payload }) => payload);

  const { data: insertedRows, error: insertError } = await supabase
    .from("account_invoices")
    .insert(insertPayload)
    .select("id, invoice_number, account_number, billing_month, total_amount");

  if (insertError) throw insertError;

  console.log(
    JSON.stringify(
      {
        insertedCount: Array.isArray(insertedRows) ? insertedRows.length : 0,
        insertedRows,
        reportPath: REPORT_PATH,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
