const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const REPORT_PATH = path.resolve(process.cwd(), "tmp", "unlinked-imported-age-analysis-report.json");
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

async function main() {
  const summary = {
    mode: applyMode ? "apply" : "dry-run",
    importedInvoicesFound: 0,
    importedPaymentsFound: 0,
    paymentsRowsLinkedFound: 0,
    importedInvoicesDeleted: 0,
    importedPaymentsDeleted: 0,
    paymentsRowsUnlinked: 0,
  };

  const { data: importedInvoices, error: importedInvoicesError } = await supabase
    .from("account_invoices")
    .select("id, account_number, invoice_number, billing_month")
    .eq("billing_month", OPENING_BILLING_MONTH)
    .ilike("notes", `${IMPORT_NOTE_MARKER}%`);
  if (importedInvoicesError) throw importedInvoicesError;

  const { data: importedPayments, error: importedPaymentsError } = await supabase
    .from("account_invoice_payments")
    .select("id, account_number, invoice_number, billing_month")
    .eq("billing_month", OPENING_BILLING_MONTH)
    .ilike("notes", `${PAYMENT_NOTE_MARKER}%`);
  if (importedPaymentsError) throw importedPaymentsError;

  const { data: linkedMirrors, error: linkedMirrorsError } = await supabase
    .from("payments_")
    .select("id, cost_code, account_invoice_id, invoice_number, reference, billing_month")
    .eq("billing_month", OPENING_BILLING_MONTH)
    .like("invoice_number", "OPEN-%");
  if (linkedMirrorsError) throw linkedMirrorsError;

  summary.importedInvoicesFound = (importedInvoices || []).length;
  summary.importedPaymentsFound = (importedPayments || []).length;
  summary.paymentsRowsLinkedFound = (linkedMirrors || []).length;

  if (applyMode) {
    const mirrorIds = (linkedMirrors || []).map((row) => row.id);
    if (mirrorIds.length > 0) {
      const { error } = await supabase
        .from("payments_")
        .update({
          account_invoice_id: null,
          invoice_number: null,
          reference: null,
        })
        .in("id", mirrorIds);
      if (error) throw error;
      summary.paymentsRowsUnlinked = mirrorIds.length;
    }

    const paymentIds = (importedPayments || []).map((row) => row.id);
    if (paymentIds.length > 0) {
      const { error } = await supabase.from("account_invoice_payments").delete().in("id", paymentIds);
      if (error) throw error;
      summary.importedPaymentsDeleted = paymentIds.length;
    }

    const invoiceIds = (importedInvoices || []).map((row) => row.id);
    if (invoiceIds.length > 0) {
      const { error } = await supabase.from("account_invoices").delete().in("id", invoiceIds);
      if (error) throw error;
      summary.importedInvoicesDeleted = invoiceIds.length;
    }
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
