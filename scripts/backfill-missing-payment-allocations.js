const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

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

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

async function fetchAll(table, select, pageSize = 1000) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    rows.push(...(data || []));

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

async function main() {
  const [payments, invoices, existingAllocations] = await Promise.all([
    fetchAll(
      "account_invoice_payments",
      "id, account_invoice_id, account_number, billing_month, invoice_number, payment_reference, notes, payment_date, created_at, created_by, created_by_email, amount",
    ),
    fetchAll("account_invoices", "id, total_amount"),
    fetchAll("account_payment_allocations", "payment_id, allocation_type"),
  ]);

  const invoiceTotalById = new Map(
    invoices.map((invoice) => [String(invoice.id || ""), roundCurrency(invoice.total_amount)]),
  );

  const allocationTypesByPaymentId = new Map();
  for (const allocation of existingAllocations) {
    const key = String(allocation.payment_id || "");
    if (!allocationTypesByPaymentId.has(key)) {
      allocationTypesByPaymentId.set(key, new Set());
    }
    allocationTypesByPaymentId.get(key).add(String(allocation.allocation_type || ""));
  }

  const orderedPayments = [...payments].sort((left, right) => {
    const leftInvoice = String(left.account_invoice_id || "");
    const rightInvoice = String(right.account_invoice_id || "");
    if (leftInvoice !== rightInvoice) return leftInvoice.localeCompare(rightInvoice);

    const leftTime = new Date(
      String(left.payment_date || left.created_at || "1970-01-01T00:00:00.000Z"),
    ).getTime();
    const rightTime = new Date(
      String(right.payment_date || right.created_at || "1970-01-01T00:00:00.000Z"),
    ).getTime();
    if (leftTime !== rightTime) return leftTime - rightTime;

    const leftCreated = new Date(
      String(left.created_at || left.payment_date || "1970-01-01T00:00:00.000Z"),
    ).getTime();
    const rightCreated = new Date(
      String(right.created_at || right.payment_date || "1970-01-01T00:00:00.000Z"),
    ).getTime();
    if (leftCreated !== rightCreated) return leftCreated - rightCreated;

    return String(left.id || "").localeCompare(String(right.id || ""));
  });

  const priorPaidByInvoiceId = new Map();
  const allocationRows = [];
  const sample = [];

  for (const payment of orderedPayments) {
    const paymentId = String(payment.id || "");
    if (!paymentId) continue;

    const existingTypes = allocationTypesByPaymentId.get(paymentId) || new Set();
    const paymentAmount = roundCurrency(payment.amount);
    const accountInvoiceId = String(payment.account_invoice_id || "");
    const priorPaidAgainstInvoice = roundCurrency(priorPaidByInvoiceId.get(accountInvoiceId) || 0);
    const invoiceTotal = accountInvoiceId
      ? roundCurrency(invoiceTotalById.get(accountInvoiceId) || 0)
      : 0;

    let invoiceAppliedAmount = paymentAmount;
    if (accountInvoiceId && invoiceTotal > 0) {
      invoiceAppliedAmount = roundCurrency(
        Math.min(paymentAmount, Math.max(invoiceTotal - priorPaidAgainstInvoice, 0)),
      );
    }

    const creditAmount = roundCurrency(Math.max(paymentAmount - invoiceAppliedAmount, 0));

    if (invoiceAppliedAmount > 0 && !existingTypes.has("invoice")) {
      allocationRows.push({
        payment_id: paymentId,
        account_number: payment.account_number || null,
        account_invoice_id: payment.account_invoice_id || null,
        billing_month: payment.billing_month || null,
        allocation_type: "invoice",
        amount: invoiceAppliedAmount,
        payment_date: payment.payment_date || null,
        reference: payment.payment_reference || null,
        notes: payment.notes || null,
        meta: {
          backfilled: true,
          source: "account_invoice_payments_backfill",
          payment_amount: paymentAmount,
          invoice_total: invoiceTotal,
          prior_paid_against_invoice: priorPaidAgainstInvoice,
        },
        created_by: payment.created_by || null,
        created_by_email: payment.created_by_email || null,
      });
    }

    if (creditAmount > 0 && !existingTypes.has("credit")) {
      allocationRows.push({
        payment_id: paymentId,
        account_number: payment.account_number || null,
        account_invoice_id: payment.account_invoice_id || null,
        billing_month: payment.billing_month || null,
        allocation_type: "credit",
        amount: creditAmount,
        payment_date: payment.payment_date || null,
        reference: payment.payment_reference || null,
        notes: payment.notes || null,
        meta: {
          backfilled: true,
          source: "account_invoice_payments_backfill",
          payment_amount: paymentAmount,
          invoice_total: invoiceTotal,
          prior_paid_against_invoice: priorPaidAgainstInvoice,
        },
        created_by: payment.created_by || null,
        created_by_email: payment.created_by_email || null,
      });
    }

    priorPaidByInvoiceId.set(
      accountInvoiceId,
      roundCurrency(priorPaidAgainstInvoice + paymentAmount),
    );

    if (sample.length < 20 && (invoiceAppliedAmount > 0 || creditAmount > 0) && existingTypes.size === 0) {
      sample.push({
        payment_id: paymentId,
        account_number: payment.account_number,
        payment_reference: payment.payment_reference,
        payment_amount: paymentAmount,
        invoice_applied_amount: invoiceAppliedAmount,
        credit_amount: creditAmount,
      });
    }
  }

  if (applyMode && allocationRows.length > 0) {
    const batchSize = 500;
    for (let index = 0; index < allocationRows.length; index += batchSize) {
      const batch = allocationRows.slice(index, index + batchSize);
      const { error } = await supabase.from("account_payment_allocations").insert(batch);
      if (error) throw error;
    }
  }

  const summary = {
    mode: applyMode ? "apply" : "dry-run",
    payments_checked: payments.length,
    existing_allocations: existingAllocations.length,
    allocations_to_insert: allocationRows.length,
    payments_without_any_allocations: sample.length,
    sample,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
