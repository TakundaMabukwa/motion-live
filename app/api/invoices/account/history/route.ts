import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const normalize = (value: unknown) => String(value || "").trim().toUpperCase();

const normalizeBillingMonthValue = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}$/.test(raw)) {
    return `${raw}-01`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw.slice(0, 10);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

const getBillingMonthCutoff = (billingMonth: string) => {
  if (!billingMonth) return null;
  const parsed = new Date(`${billingMonth}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0, 23, 59, 59, 999));
};

const isOnOrBeforeBillingMonth = (
  billingMonth: string,
  value: unknown,
  fallbackDateValue?: unknown,
) => {
  if (!billingMonth) return true;

  const normalizedValue = normalizeBillingMonthValue(value);
  if (normalizedValue) {
    return normalizedValue <= billingMonth;
  }

  const fallback = fallbackDateValue ? new Date(String(fallbackDateValue)) : null;
  const cutoff = getBillingMonthCutoff(billingMonth);
  if (!fallback || Number.isNaN(fallback.getTime()) || !cutoff) {
    return false;
  }

  return fallback.getTime() <= cutoff.getTime();
};

async function loadImportedReceiptPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountNumber: string,
) {
  const { data, error } = await supabase
    .from("imported_account_payments")
    .select(
      "id, account_number, billing_month_applied_to, payment_date, amount, payer_name, reference, notes, created_at",
    )
    .eq("account_number", accountNumber)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load imported receipt history:", error);
    return [];
  }

  return (Array.isArray(data) ? data : []).map((payment, index) => ({
    id: payment.id || `imported-${normalize(accountNumber)}-${index + 1}`,
    account_invoice_id: null,
    account_number: accountNumber,
    billing_month: payment.billing_month_applied_to || null,
    invoice_number: null,
    payment_reference: payment.reference || "payment",
    amount: Number(payment.amount || 0),
    payment_date: payment.payment_date || null,
    payment_method: "import",
    notes: payment.notes || "Imported from March Receipts sheet",
    payer_name: payment.payer_name || null,
    created_at: payment.created_at || payment.payment_date || null,
    imported_from_age_analysis: true,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = String(searchParams.get("accountNumber") || "").trim();
    const billingMonth = normalizeBillingMonthValue(searchParams.get("billingMonth"));

    if (!accountNumber) {
      return NextResponse.json(
        { error: "accountNumber is required" },
        { status: 400 },
      );
    }

    const [
      { data: invoices, error: invoicesError },
      { data: payments, error: paymentsError },
      { data: agingRows, error: agingError },
      { data: creditNotes, error: creditNotesError },
      importedPayments,
    ] = await Promise.all([
      supabase
        .from("account_invoices")
        .select(
          "id, account_number, billing_month, invoice_number, company_name, invoice_date, total_amount, paid_amount, balance_due, credit_amount, payment_status, notes, created_at",
        )
        .eq("account_number", accountNumber)
        .order("billing_month", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("account_invoice_payments")
        .select(
          "id, account_invoice_id, account_number, billing_month, invoice_number, payment_reference, amount, payment_date, payment_method, notes, created_at",
        )
        .eq("account_number", accountNumber)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("payments_")
        .select(
          "id, cost_code, billing_month, due_amount, paid_amount, balance_due, amount_due, current_due, overdue_30_days, overdue_60_days, overdue_90_days, overdue_120_plus_days, outstanding_balance, credit_amount, payment_status, invoice_number, invoice_date, last_updated",
        )
        .eq("cost_code", accountNumber)
        .order("billing_month", { ascending: false, nullsFirst: false })
        .order("last_updated", { ascending: false }),
      supabase
        .from("credit_notes")
        .select(
          "id, credit_note_number, account_number, billing_month_applies_to, credit_note_date, amount, applied_amount, unapplied_amount, reference, comment, reason, status, account_invoice_id, created_at",
        )
        .eq("account_number", accountNumber)
        .order("credit_note_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      loadImportedReceiptPayments(supabase, accountNumber),
    ]);

    if (invoicesError || paymentsError || agingError || creditNotesError) {
      const error = invoicesError || paymentsError || agingError || creditNotesError;
      console.error("Failed to fetch account invoice/payment history:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch account invoice history" },
        { status: 500 },
      );
    }

    const filteredInvoices = (Array.isArray(invoices) ? invoices : []).filter((invoice) =>
      isOnOrBeforeBillingMonth(
        billingMonth,
        invoice?.billing_month,
        invoice?.invoice_date || invoice?.created_at,
      ),
    );

    const livePayments = (Array.isArray(payments) ? payments : []).filter((payment) =>
      isOnOrBeforeBillingMonth(
        billingMonth,
        payment?.billing_month,
        payment?.payment_date || payment?.created_at,
      ),
    );
    const hasImportedLedgerPayments = livePayments.some((payment) =>
      String(payment?.notes || "").includes("Imported from March Receipts sheet"),
    );
    const filteredImportedPayments = importedPayments.filter((payment) =>
      isOnOrBeforeBillingMonth(
        billingMonth,
        payment?.billing_month,
        payment?.payment_date || payment?.created_at,
      ),
    );
    const mergedPayments = hasImportedLedgerPayments
      ? livePayments
      : [...filteredImportedPayments, ...livePayments].sort((left, right) => {
          const leftTime = new Date(
            String(left?.payment_date || left?.created_at || 0),
          ).getTime();
          const rightTime = new Date(
            String(right?.payment_date || right?.created_at || 0),
          ).getTime();
          return rightTime - leftTime;
        });

    const invoiceByPeriod = new Map(
      filteredInvoices.map((invoice) => [
        `${normalize(invoice?.account_number)}|${String(invoice?.billing_month || "").trim()}`,
        invoice,
      ]),
    );

    const agingPeriods = (Array.isArray(agingRows) ? agingRows : [])
      .filter((row) =>
        isOnOrBeforeBillingMonth(
          billingMonth,
          row?.billing_month,
          row?.invoice_date || row?.last_updated,
        ),
      )
      .map((row) => {
        const matchingInvoice = invoiceByPeriod.get(
          `${normalize(accountNumber)}|${String(row?.billing_month || "").trim()}`,
        );
        const currentDue = Number(row?.current_due || 0);
        const overdue30 = Number(row?.overdue_30_days || 0);
        const overdue60 = Number(row?.overdue_60_days || 0);
        const overdue90 = Number(row?.overdue_90_days || 0);
        const overdue120 = Number(row?.overdue_120_plus_days || 0);
        const outstanding =
          Number(row?.outstanding_balance ?? row?.balance_due ?? row?.amount_due ?? 0) ||
          currentDue + overdue30 + overdue60 + overdue90 + overdue120;

        return {
          id: row?.id || null,
          account_number: accountNumber,
          billing_month: row?.billing_month || null,
          invoice_number: matchingInvoice?.invoice_number || row?.invoice_number || null,
          invoice_date: matchingInvoice?.invoice_date || row?.invoice_date || null,
          due_amount: Number(matchingInvoice?.total_amount ?? row?.due_amount ?? 0),
          paid_amount: Number(matchingInvoice?.paid_amount ?? row?.paid_amount ?? 0),
          balance_due: Number(
            matchingInvoice?.balance_due ??
              row?.balance_due ??
              row?.amount_due ??
              outstanding ??
              0,
          ),
          outstanding_balance: Number(outstanding || 0),
          current_due: currentDue,
          overdue_30_days: overdue30,
          overdue_60_days: overdue60,
          overdue_90_days: overdue90,
          overdue_120_plus_days: overdue120,
          credit_amount: Number(matchingInvoice?.credit_amount ?? row?.credit_amount ?? 0),
          payment_status: matchingInvoice?.payment_status || row?.payment_status || null,
          last_updated: row?.last_updated || null,
        };
      })
      .filter((row) => {
        const outstanding = Number(row.outstanding_balance || 0);
        const bucketTotal =
          Number(row.current_due || 0) +
          Number(row.overdue_30_days || 0) +
          Number(row.overdue_60_days || 0) +
          Number(row.overdue_90_days || 0) +
          Number(row.overdue_120_plus_days || 0);
        return outstanding > 0 || bucketTotal > 0;
      });

    const filteredCreditNotes = (Array.isArray(creditNotes) ? creditNotes : []).filter((creditNote) =>
      isOnOrBeforeBillingMonth(
        billingMonth,
        creditNote?.billing_month_applies_to,
        creditNote?.credit_note_date || creditNote?.created_at,
      ),
    );

    return NextResponse.json({
      invoices: filteredInvoices,
      payments: mergedPayments,
      agingPeriods,
      creditNotes: filteredCreditNotes,
    });
  } catch (error) {
    console.error("Unexpected error in account invoice history GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
