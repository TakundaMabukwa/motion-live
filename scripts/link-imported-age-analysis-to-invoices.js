const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DETAIL_PATH = path.resolve(process.cwd(), "tmp", "amended-debtors-import-detail.json");
const REPORT_PATH = path.resolve(process.cwd(), "tmp", "linked-imported-age-analysis-report.json");
const OPENING_BILLING_MONTH = "2026-02-01";
const IMPORT_NOTE_MARKER = "[Imported Opening Balance Snapshot]";
const PAYMENT_NOTE_MARKER = "[Imported March Receipt Allocation]";

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

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundCurrency(value) {
  return Number(toNumber(value).toFixed(2));
}

function paymentStatusFor(balanceDue, paidAmount) {
  if (balanceDue <= 0) return "paid";
  if (paidAmount > 0) return "partial";
  return "pending";
}

function buildOpeningInvoiceNumber(accountNumber) {
  const compact = String(accountNumber || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return `OPEN-${compact}-202602`;
}

function buildOpeningInvoicePayload(entry, existingInvoiceId = null) {
  const lineItems = [
    {
      description: "Imported opening balance as at 28/02/2026",
      current_due: roundCurrency(entry.opening_before.current_due),
      overdue_30_days: roundCurrency(entry.opening_before.overdue_30_days),
      overdue_60_days: roundCurrency(entry.opening_before.overdue_60_days),
      overdue_90_days: roundCurrency(entry.opening_before.overdue_90_days),
      overdue_120_plus_days: roundCurrency(entry.opening_before.overdue_120_plus_days),
      outstanding_balance: roundCurrency(entry.opening_before.outstanding_balance),
    },
  ];

  return {
    id: existingInvoiceId || undefined,
    account_number: entry.cost_code,
    billing_month: OPENING_BILLING_MONTH,
    invoice_number: buildOpeningInvoiceNumber(entry.cost_code),
    company_name: entry.opening_after.company || entry.client_name || null,
    client_address: entry.opening_after.postal_address || null,
    customer_vat_number: null,
    invoice_date: "2026-02-28T00:00:00.000Z",
    subtotal: roundCurrency(entry.opening_before.outstanding_balance),
    vat_amount: 0,
    discount_amount: 0,
    total_amount: roundCurrency(entry.opening_before.outstanding_balance),
    line_items: lineItems,
    notes: `${IMPORT_NOTE_MARKER} Opening balance imported from Amended Debtors age analysis workbook.`,
    due_date: "2026-02-28",
    paid_amount: roundCurrency(entry.opening_after.paid_amount),
    balance_due: roundCurrency(entry.opening_after.balance_due),
    payment_status: paymentStatusFor(
      roundCurrency(entry.opening_after.balance_due),
      roundCurrency(entry.opening_after.paid_amount),
    ),
    company_registration_number: null,
    last_payment_at: entry.receipts.length
      ? entry.receipts[entry.receipts.length - 1].payment_date
      : null,
    last_payment_reference: entry.receipts.length
      ? `Imported March receipt ${entry.receipts[entry.receipts.length - 1].payment_date.slice(0, 10)}`
      : null,
    fully_paid_at: roundCurrency(entry.opening_after.balance_due) <= 0 && entry.receipts.length
      ? entry.receipts[entry.receipts.length - 1].payment_date
      : null,
  };
}

async function main() {
  const detail = JSON.parse(fs.readFileSync(DETAIL_PATH, "utf8"));
  const summary = {
    mode: applyMode ? "apply" : "dry-run",
    accounts: detail.length,
    openingInvoicesUpserted: 0,
    importedPaymentsDeleted: 0,
    importedPaymentsInserted: 0,
    paymentsMirrorLinked: 0,
    sample: [],
  };

  for (const entry of detail) {
    const openingInvoiceNumber = buildOpeningInvoiceNumber(entry.cost_code);

    const { data: existingInvoices, error: existingInvoiceError } = await supabase
      .from("account_invoices")
      .select("id, invoice_number")
      .eq("account_number", entry.cost_code)
      .eq("billing_month", OPENING_BILLING_MONTH)
      .limit(1);

    if (existingInvoiceError) throw existingInvoiceError;

    const existingInvoice = Array.isArray(existingInvoices) ? existingInvoices[0] || null : null;
    const openingInvoicePayload = buildOpeningInvoicePayload(entry, existingInvoice?.id || null);

    let openingInvoiceId = existingInvoice?.id || null;

    if (applyMode) {
      const invoiceOperation = openingInvoiceId
        ? supabase.from("account_invoices").update(openingInvoicePayload).eq("id", openingInvoiceId).select("id").single()
        : supabase.from("account_invoices").insert(openingInvoicePayload).select("id").single();

      const { data: upsertedInvoice, error: upsertInvoiceError } = await invoiceOperation;
      if (upsertInvoiceError) throw upsertInvoiceError;
      openingInvoiceId = upsertedInvoice?.id || openingInvoiceId;
    }

    summary.openingInvoicesUpserted += 1;

    const { data: existingImportedPayments, error: existingPaymentsError } = await supabase
      .from("account_invoice_payments")
      .select("id")
      .eq("account_number", entry.cost_code)
      .eq("billing_month", OPENING_BILLING_MONTH)
      .ilike("notes", `${PAYMENT_NOTE_MARKER}%`);

    if (existingPaymentsError) throw existingPaymentsError;

    const importedPaymentIds = (existingImportedPayments || []).map((row) => row.id);
    summary.importedPaymentsDeleted += importedPaymentIds.length;

    if (applyMode && importedPaymentIds.length > 0) {
      const { error: deletePaymentsError } = await supabase
        .from("account_invoice_payments")
        .delete()
        .in("id", importedPaymentIds);
      if (deletePaymentsError) throw deletePaymentsError;
    }

    const paymentRows = entry.receipts
      .filter((receipt) => roundCurrency(receipt.appliedAmount) > 0)
      .map((receipt, index) => ({
        account_invoice_id: openingInvoiceId,
        account_number: entry.cost_code,
        billing_month: OPENING_BILLING_MONTH,
        invoice_number: openingInvoiceNumber,
        payment_reference: `IMPORTED-MARCH-${entry.cost_code}-${String(index + 1).padStart(2, "0")}`,
        amount: roundCurrency(receipt.appliedAmount),
        payment_date: receipt.payment_date,
        payment_method: "import",
        notes: `${PAYMENT_NOTE_MARKER} Imported from March Receipts sheet. Allocation: current=${roundCurrency(
          receipt.applied.current_due,
        )}, 30=${roundCurrency(receipt.applied.overdue_30_days)}, 60=${roundCurrency(
          receipt.applied.overdue_60_days,
        )}, 90=${roundCurrency(receipt.applied.overdue_90_days)}, 120+=${roundCurrency(
          receipt.applied.overdue_120_plus_days,
        )}.`,
      }));

    summary.importedPaymentsInserted += paymentRows.length;

    if (applyMode && paymentRows.length > 0) {
      const { error: insertPaymentsError } = await supabase
        .from("account_invoice_payments")
        .insert(paymentRows);
      if (insertPaymentsError) throw insertPaymentsError;
    }

    if (applyMode && openingInvoiceId) {
      const { error: linkMirrorError } = await supabase
        .from("payments_")
        .update({
          account_invoice_id: openingInvoiceId,
          invoice_number: openingInvoiceNumber,
          reference: openingInvoiceNumber,
        })
        .eq("cost_code", entry.cost_code)
        .eq("billing_month", OPENING_BILLING_MONTH);

      if (linkMirrorError) throw linkMirrorError;
    }

    summary.paymentsMirrorLinked += 1;

    if (summary.sample.length < 10) {
      summary.sample.push({
        cost_code: entry.cost_code,
        openingInvoiceNumber,
        appliedPayments: paymentRows.length,
        appliedAmount: roundCurrency(
          paymentRows.reduce((sum, row) => sum + toNumber(row.amount), 0),
        ),
      });
    }
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
