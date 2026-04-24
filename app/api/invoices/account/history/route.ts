import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const normalize = (value: unknown) => String(value || "").trim().toUpperCase();

const normalizeDateValue = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const normalizeBillingMonthValue = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}$/.test(raw)) {
    return `${raw}-01`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw.slice(0, 7)}-01`;
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

  const cutoff = getBillingMonthCutoff(billingMonth);
  const fallback = fallbackDateValue ? new Date(String(fallbackDateValue)) : null;
  const hasRealFallbackDate =
    Boolean(fallback) && !Number.isNaN(fallback.getTime()) && Boolean(cutoff);

  const normalizedValue = normalizeBillingMonthValue(value);
  if (normalizedValue) {
    if (normalizedValue > billingMonth) {
      return false;
    }

    if (hasRealFallbackDate) {
      return fallback.getTime() <= cutoff.getTime();
    }

    return true;
  }

  if (!fallback || Number.isNaN(fallback.getTime()) || !cutoff) {
    return false;
  }

  return fallback.getTime() <= cutoff.getTime();
};

const isAccountStyleInvoice = (invoice: Record<string, unknown> | null | undefined) => {
  const sourceType = String(invoice?.source_type || "").trim();
  return sourceType === "account_invoice" || sourceType === "bulk_account_invoice";
};

const isInvoiceOnOrBeforeBillingMonth = (
  billingMonth: string,
  invoice: Record<string, unknown> | null | undefined,
) => {
  if (!billingMonth) return true;

  const normalizedInvoiceBillingMonth = normalizeBillingMonthValue(invoice?.billing_month);
  if (isAccountStyleInvoice(invoice) && normalizedInvoiceBillingMonth) {
    return normalizedInvoiceBillingMonth <= billingMonth;
  }

  return isOnOrBeforeBillingMonth(
    billingMonth,
    invoice?.billing_month,
    invoice?.invoice_date || invoice?.created_at,
  );
};

async function loadImportedReceiptPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountNumbers: string[],
) {
  const normalizedAccounts = Array.from(
    new Set(
      accountNumbers
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

  if (normalizedAccounts.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("imported_account_payments")
    .select(
      "id, account_number, billing_month_applied_to, payment_date, amount, payer_name, reference, notes, created_at",
    )
    .in("account_number", normalizedAccounts)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load imported receipt history:", error);
    return [];
  }

  return (Array.isArray(data) ? data : []).map((payment, index) => ({
    id: payment.id || `imported-${normalize(payment?.account_number)}-${index + 1}`,
    account_invoice_id: null,
    account_number: payment.account_number || null,
    billing_month: payment.billing_month_applied_to || null,
    invoice_number: null,
    payment_reference: payment.reference || "payment",
    amount: Number(payment.amount || 0),
    payment_date: payment.payment_date || null,
    payment_method: "",
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
    const accountNumbers = Array.from(
      new Set(
        [accountNumber, ...String(searchParams.get("accountNumbers") || "")
          .split(",")
          .map((value) => String(value || "").trim())
          .filter(Boolean)]
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );

    if (!accountNumber) {
      return NextResponse.json(
        { error: "accountNumber is required" },
        { status: 400 },
      );
    }

    const [
      { data: invoices, error: invoicesError },
      { data: accountJobCards, error: accountJobCardsError },
      { data: payments, error: paymentsError },
      { data: agingRows, error: agingError },
      { data: creditNotes, error: creditNotesError },
      { data: bulkInvoices, error: bulkInvoicesError },
      importedPayments,
    ] = await Promise.all([
      supabase
        .from("account_invoices")
        .select(
          "id, account_number, billing_month, invoice_number, company_name, invoice_date, total_amount, paid_amount, balance_due, credit_amount, payment_status, notes, created_at, line_items",
        )
        .in("account_number", accountNumbers)
        .order("billing_month", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("job_cards")
        .select("id, new_account_number, job_number, customer_name, vehicle_registration, quotation_products, quotation_total_amount, billing_statuses, completion_date, updated_at")
        .in("new_account_number", accountNumbers),
      supabase
        .from("account_invoice_payments")
        .select(
          "id, account_invoice_id, account_number, billing_month, invoice_number, payment_reference, amount, payment_date, payment_method, notes, created_at",
        )
        .in("account_number", accountNumbers)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("payments_")
        .select(
          "id, cost_code, billing_month, due_amount, paid_amount, balance_due, amount_due, current_due, overdue_30_days, overdue_60_days, overdue_90_days, overdue_120_plus_days, outstanding_balance, credit_amount, payment_status, invoice_number, invoice_date, last_updated",
        )
        .in("cost_code", accountNumbers)
        .order("billing_month", { ascending: false, nullsFirst: false })
        .order("last_updated", { ascending: false }),
      supabase
        .from("credit_notes")
        .select(
          "id, credit_note_number, account_number, billing_month_applies_to, credit_note_date, amount, applied_amount, unapplied_amount, reference, comment, reason, status, account_invoice_id, created_at",
        )
        .in("account_number", accountNumbers)
        .order("credit_note_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("bulk_account_invoices")
        .select(
          "id, account_number, billing_month, invoice_number, company_name, invoice_date, total_amount, notes, created_at, line_items",
        )
        .in("account_number", accountNumbers)
        .order("billing_month", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      loadImportedReceiptPayments(supabase, accountNumbers),
    ]);

    if (
      invoicesError ||
      accountJobCardsError ||
      paymentsError ||
      agingError ||
      creditNotesError ||
      bulkInvoicesError
    ) {
      const error =
        invoicesError ||
        accountJobCardsError ||
        paymentsError ||
        agingError ||
        creditNotesError ||
        bulkInvoicesError;
      console.error("Failed to fetch account invoice/payment history:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch account invoice history" },
        { status: 500 },
      );
    }

    const accountJobCardIds = new Set(
      (Array.isArray(accountJobCards) ? accountJobCards : [])
        .map((row) => String(row?.id || "").trim())
        .filter(Boolean),
    );
    const accountJobNumbers = Array.from(
      new Set(
        (Array.isArray(accountJobCards) ? accountJobCards : [])
          .map((row) => String(row?.job_number || "").trim())
          .filter(Boolean),
      ),
    );

    const jobCardById = new Map(
      (Array.isArray(accountJobCards) ? accountJobCards : [])
        .map((row) => [String(row?.id || "").trim(), row])
        .filter(([id]) => Boolean(id)),
    );
    const jobCardByNumber = new Map(
      (Array.isArray(accountJobCards) ? accountJobCards : [])
        .map((row) => [String(row?.job_number || "").trim(), row])
        .filter(([jobNumber]) => Boolean(jobNumber)),
    );

    const [
      { data: jobCardInvoicesByAccount, error: jobCardInvoicesByAccountError },
      { data: jobCardInvoicesById, error: jobCardInvoicesByIdError },
      { data: jobCardInvoicesByNumber, error: jobCardInvoicesByNumberError },
    ] = await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id, job_card_id, job_number, account_number, client_name, invoice_number, invoice_date, subtotal, vat_amount, total_amount, due_date, notes, created_at, line_items",
        )
        .in("account_number", accountNumbers)
        .order("invoice_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      accountJobCardIds.size > 0
        ? supabase
            .from("invoices")
            .select(
              "id, job_card_id, job_number, account_number, client_name, invoice_number, invoice_date, subtotal, vat_amount, total_amount, due_date, notes, created_at, line_items",
            )
            .in("job_card_id", Array.from(accountJobCardIds))
            .order("invoice_date", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      accountJobNumbers.length > 0
        ? supabase
            .from("invoices")
            .select(
              "id, job_card_id, job_number, account_number, client_name, invoice_number, invoice_date, subtotal, vat_amount, total_amount, due_date, notes, created_at, line_items",
            )
            .in("job_number", accountJobNumbers)
            .order("invoice_date", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (jobCardInvoicesByAccountError || jobCardInvoicesByIdError || jobCardInvoicesByNumberError) {
      const error =
        jobCardInvoicesByAccountError ||
        jobCardInvoicesByIdError ||
        jobCardInvoicesByNumberError;
      console.error("Failed to fetch old job-card invoices:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch job-card invoices" },
        { status: 500 },
      );
    }

    const normalizedAccountInvoices = (Array.isArray(invoices) ? invoices : []).map(
      (invoice) => ({
        ...invoice,
        invoice_items: Array.isArray(invoice?.line_items) ? invoice.line_items : [],
        source_type: "account_invoice",
      }),
    );

    const mergedOldJobCardInvoices = Array.from(
      new Map(
        [
          ...(Array.isArray(jobCardInvoicesByAccount) ? jobCardInvoicesByAccount : []),
          ...(Array.isArray(jobCardInvoicesById) ? jobCardInvoicesById : []),
          ...(Array.isArray(jobCardInvoicesByNumber) ? jobCardInvoicesByNumber : []),
        ].map((invoice) => [String(invoice?.id || ""), invoice]),
      ).values(),
    );

    const normalizedJobCardInvoices = mergedOldJobCardInvoices
      .filter((invoice) => {
        const invoiceAccountNumber = String(invoice?.account_number || "").trim();
        if (invoiceAccountNumber && accountNumbers.includes(invoiceAccountNumber)) {
          return true;
        }

        const jobCardId = String(invoice?.job_card_id || "").trim();
        const jobNumber = String(invoice?.job_number || "").trim();
        return (
          !jobCardId ||
          accountJobCardIds.has(jobCardId) ||
          (jobNumber && accountJobNumbers.includes(jobNumber))
        );
      })
      .map((invoice) => ({
        id: invoice.id,
        account_number: invoice.account_number || accountNumber,
        billing_month:
          normalizeBillingMonthValue(invoice?.invoice_date) ||
          normalizeBillingMonthValue(invoice?.created_at) ||
          null,
        invoice_number: invoice.invoice_number || null,
        company_name: invoice.client_name || null,
        invoice_date: invoice.invoice_date || null,
        total_amount: Number(invoice.total_amount || invoice.subtotal || 0),
        paid_amount: 0,
        balance_due: Number(invoice.total_amount || invoice.subtotal || 0),
        credit_amount: 0,
        payment_status: "pending",
        notes: invoice.notes || null,
        created_at: invoice.created_at || null,
        due_date: invoice.due_date || null,
        job_card_id: invoice.job_card_id || null,
        job_number: invoice.job_number || null,
        invoice_items: Array.isArray(invoice?.line_items) ? invoice.line_items : [],
        source_type: "job_card_invoice",
      }));

    const invoicedJobs = Array.from(
      new Map(
        [
          ...(Array.isArray(accountJobCards) ? accountJobCards : [])
            .filter((row) => {
              const invoiceNumber = String(
                row?.billing_statuses?.invoice?.invoice_number || "",
              ).trim();
              return Boolean(invoiceNumber);
            })
            .map((row) => {
              const invoiceNumber = String(
                row?.billing_statuses?.invoice?.invoice_number || "",
              ).trim();
              const key = `${String(row?.new_account_number || "").trim()}|${invoiceNumber}|${String(row?.job_number || "").trim()}`;

              return [
                key,
                {
                  id: row?.id || null,
                  account_number: row?.new_account_number || null,
                  job_number: row?.job_number || null,
                  customer_name: row?.customer_name || null,
                  vehicle_registration: row?.vehicle_registration || null,
                  quotation_products: Array.isArray(row?.quotation_products) ? row.quotation_products : [],
                  total_amount: Number(
                    row?.billing_statuses?.invoice?.total_amount ??
                      row?.quotation_total_amount ??
                      0,
                  ),
                  invoice_number: invoiceNumber || null,
                  invoice_date:
                    row?.billing_statuses?.invoice?.invoice_date ||
                    row?.completion_date ||
                    row?.updated_at ||
                    null,
                },
              ];
            }),
          ...normalizedJobCardInvoices.map((invoice) => {
            const jobCardId = String(invoice?.job_card_id || "").trim();
            const jobNumber = String(invoice?.job_number || "").trim();
            const linkedJobCard =
              jobCardById.get(jobCardId) ||
              jobCardByNumber.get(jobNumber) ||
              null;
            const lineItems = Array.isArray(invoice?.invoice_items) ? invoice.invoice_items : [];
            const derivedVehicleRegistration =
              String(
                lineItems.find((item) =>
                  String(item?.new_reg || item?.previous_reg || item?.reg || "").trim(),
                )?.new_reg ||
                  lineItems.find((item) =>
                    String(item?.new_reg || item?.previous_reg || item?.reg || "").trim(),
                  )?.previous_reg ||
                  lineItems.find((item) =>
                    String(item?.new_reg || item?.previous_reg || item?.reg || "").trim(),
                  )?.reg ||
                  linkedJobCard?.vehicle_registration ||
                  "",
              ).trim() || null;
            const key = `${String(invoice?.account_number || "").trim()}|${String(invoice?.invoice_number || "").trim()}|${jobNumber}`;

            return [
              key,
              {
                id: linkedJobCard?.id || invoice?.job_card_id || null,
                account_number: invoice?.account_number || linkedJobCard?.new_account_number || null,
                job_number: invoice?.job_number || linkedJobCard?.job_number || null,
                customer_name: linkedJobCard?.customer_name || invoice?.company_name || null,
                vehicle_registration: derivedVehicleRegistration,
                quotation_products: Array.isArray(linkedJobCard?.quotation_products)
                  ? linkedJobCard.quotation_products
                  : [],
                total_amount: Number(
                  invoice?.total_amount ??
                    linkedJobCard?.billing_statuses?.invoice?.total_amount ??
                    linkedJobCard?.quotation_total_amount ??
                    0,
                ),
                invoice_number: invoice?.invoice_number || null,
                invoice_date: invoice?.invoice_date || null,
              },
            ];
          }),
        ].filter(([key]) => Boolean(key)),
      ).values(),
    );

    const normalizedBulkInvoices = (Array.isArray(bulkInvoices) ? bulkInvoices : []).map(
      (invoice) => ({
        ...invoice,
        paid_amount: 0,
        balance_due: Number(invoice.total_amount || 0),
        credit_amount: 0,
        payment_status: "pending",
        due_date: null,
        invoice_items: Array.isArray(invoice?.line_items) ? invoice.line_items : [],
        source_type: "bulk_account_invoice",
      }),
    );

    const mergedInvoiceMap = new Map();
    [...normalizedAccountInvoices, ...normalizedJobCardInvoices, ...normalizedBulkInvoices]
      .filter((invoice) => isInvoiceOnOrBeforeBillingMonth(billingMonth, invoice))
      .sort((left, right) => {
        const leftTime = new Date(
          String(left?.invoice_date || left?.created_at || left?.billing_month || 0),
        ).getTime();
        const rightTime = new Date(
          String(right?.invoice_date || right?.created_at || right?.billing_month || 0),
        ).getTime();
        return rightTime - leftTime;
      })
      .forEach((invoice) => {
        const invoiceNumber = String(invoice?.invoice_number || "").trim();
        const fallbackKey = [
          String(invoice?.source_type || ""),
          String(invoice?.job_card_id || ""),
          String(invoice?.billing_month || ""),
          String(invoice?.invoice_date || ""),
          String(invoice?.total_amount || ""),
        ].join("|");
        const key = invoiceNumber || fallbackKey;
        if (!mergedInvoiceMap.has(key)) {
          mergedInvoiceMap.set(key, invoice);
        }
      });

    const filteredInvoices = Array.from(mergedInvoiceMap.values()).sort(
      (left, right) => {
        const leftTime = new Date(
          String(left?.invoice_date || left?.created_at || left?.billing_month || 0),
        ).getTime();
        const rightTime = new Date(
          String(right?.invoice_date || right?.created_at || right?.billing_month || 0),
        ).getTime();
        return rightTime - leftTime;
      },
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
    const livePaymentKeys = new Set(
      livePayments.map((payment) =>
        [
          normalize(payment?.account_number),
          normalizeBillingMonthValue(payment?.billing_month),
          normalizeDateValue(payment?.payment_date || payment?.created_at),
          Number(payment?.amount || 0).toFixed(2),
        ].join("|"),
      ),
    );
    const dedupedImportedPayments = filteredImportedPayments.filter((payment) => {
      const key = [
        normalize(payment?.account_number),
        normalizeBillingMonthValue(payment?.billing_month),
        normalizeDateValue(payment?.payment_date || payment?.created_at),
        Number(payment?.amount || 0).toFixed(2),
      ].join("|");
      return !livePaymentKeys.has(key);
    });
    const mergedPayments = hasImportedLedgerPayments
      ? livePayments
      : [...dedupedImportedPayments, ...livePayments].sort((left, right) => {
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
        const agingAccountNumber = normalize(row?.cost_code || accountNumber);
        const matchingInvoice = invoiceByPeriod.get(
          `${agingAccountNumber}|${String(row?.billing_month || "").trim()}`,
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
          account_number: row?.cost_code || accountNumber,
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
      invoicedJobs,
    });
  } catch (error) {
    console.error("Unexpected error in account invoice history GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
