import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getOperationalBillingMonthKey,
  normalizeAgingBucketsToOutstanding,
  normalizeBillingMonth,
} from "@/lib/server/account-invoice-payments";

const toNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeKey = (value: unknown) => String(value || "").trim().toUpperCase();

const parseQuotationProducts = (value: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const getJobValue = (job: {
  quotation_products?: unknown;
  quotation_total_amount?: number | string | null;
  estimated_cost?: number | string | null;
}) => {
  const productTotal = parseQuotationProducts(job.quotation_products).reduce(
    (sum, product) => {
      const totalPrice = Number(product?.total_price || 0);
      return Number.isFinite(totalPrice) && totalPrice > 0 ? sum + totalPrice : sum;
    },
    0,
  );

  if (productTotal > 0) {
    return productTotal;
  }

  for (const candidate of [
    job.quotation_total_amount,
    job.estimated_cost,
  ]) {
    const numeric = Number(candidate || 0);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return 0;
};

const isClosedJob = (job: { job_status?: unknown; status?: unknown }) => {
  const jobStatus = String(job.job_status || "").trim().toLowerCase();
  const status = String(job.status || "").trim().toLowerCase();

  return (
    jobStatus === "completed" ||
    jobStatus === "invoiced" ||
    jobStatus === "closed" ||
    status === "completed" ||
    status === "invoiced" ||
    status === "closed"
  );
};

const getBillingMonthRange = (billingMonth: string) => {
  const start = new Date(`${billingMonth}T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
};

const isInBillingMonth = (value: unknown, billingMonth: string) => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return false;
  const { start, end } = getBillingMonthRange(billingMonth);
  return parsed >= start && parsed < end;
};

const getLockMonth = async (supabase: Awaited<ReturnType<typeof createClient>>) => {
  const { data, error } = await supabase
    .from("system_locks")
    .select("is_locked, lock_date")
    .eq("lock_key", "billing")
    .maybeSingle();

  if (error) {
    throw error;
  }

  const lockMonth = normalizeBillingMonth(data?.lock_date);
  if (data?.is_locked && lockMonth) {
    return lockMonth;
  }

  return getOperationalBillingMonthKey();
};

const buildPaymentState = ({
  outstanding,
  paymentsTotal,
  creditAmount,
  invoiceStatuses,
  rawStatus,
}: {
  outstanding: number;
  paymentsTotal: number;
  creditAmount: number;
  invoiceStatuses: string[];
  rawStatus: unknown;
}) => {
  const normalized = String(rawStatus || "").trim().toLowerCase();
  const statuses = invoiceStatuses.map((status) => String(status || "").trim().toLowerCase());

  if (outstanding <= 0.01 && creditAmount > 0.01) return "credit";
  if (statuses.some((status) => status.includes("partial"))) return "partial";
  if (outstanding <= 0.01 && (paymentsTotal > 0.01 || statuses.some((status) => status === "paid") || normalized === "paid")) {
    return "paid";
  }
  if (outstanding > 0.01 && paymentsTotal > 0.01) return "partial";
  if (normalized.includes("partial")) return "partial";
  if (normalized.includes("paid")) return "paid";
  if (outstanding > 0.01) return "pending";
  return normalized || "open";
};

const sortInvoices = (left: Record<string, unknown>, right: Record<string, unknown>) => {
  const leftDate = new Date(String(left?.invoice_date || left?.created_at || 0)).getTime();
  const rightDate = new Date(String(right?.invoice_date || right?.created_at || 0)).getTime();
  return rightDate - leftDate;
};

const getMirrorAgingTotal = (row: Record<string, unknown> | null | undefined) =>
  toNumber(row?.current_due) +
  toNumber(row?.overdue_30_days) +
  toNumber(row?.overdue_60_days) +
  toNumber(row?.overdue_90_days) +
  toNumber(row?.overdue_120_plus_days);

const getMirrorOutstanding = (row: Record<string, unknown> | null | undefined) =>
  toNumber(row?.outstanding_balance) ||
  toNumber(row?.balance_due) ||
  getMirrorAgingTotal(row);

const hasMeaningfulAgeAnalysis = (row: Record<string, unknown> | null | undefined) =>
  getMirrorOutstanding(row) > 0.01 ||
  toNumber(row?.paid_amount) > 0.01 ||
  toNumber(row?.credit_amount) > 0.01;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const requestedBillingMonth = normalizeBillingMonth(searchParams.get("billingMonth"));
    const search = String(searchParams.get("search") || "").trim().toUpperCase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedBillingMonth = requestedBillingMonth || (await getLockMonth(supabase));

    const [
      { data: costCenters, error: costCentersError },
      { data: mirrorRows, error: mirrorError },
      { data: accountInvoices, error: accountInvoicesError },
      { data: bulkInvoices, error: bulkInvoicesError },
      { data: ledgerPayments, error: ledgerPaymentsError },
      { data: importedPayments, error: importedPaymentsError },
      { data: creditNotes, error: creditNotesError },
    ] = await Promise.all([
      supabase
        .from("cost_centers")
        .select(
          `
          cost_code,
          company,
          legal_name
        `,
        )
        .order("cost_code", { ascending: true }),
      supabase
        .from("payments_")
        .select(
          `
          id,
          cost_code,
          company,
          invoice_number,
          invoice_date,
          billing_month,
          due_date,
          due_amount,
          amount_due,
          balance_due,
          current_due,
          overdue_30_days,
          overdue_60_days,
          overdue_90_days,
          overdue_120_plus_days,
          outstanding_balance,
          paid_amount,
          credit_amount,
          payment_status,
          last_updated
        `,
        )
        .lte("billing_month", resolvedBillingMonth)
        .order("billing_month", { ascending: false })
        .order("last_updated", { ascending: false, nullsFirst: false }),
      supabase
        .from("account_invoices")
        .select(
          `
          id,
          account_number,
          company_name,
          invoice_number,
          invoice_date,
          billing_month,
          due_date,
          total_amount,
          paid_amount,
          balance_due,
          credit_amount,
          payment_status,
          line_items,
          client_address,
          customer_vat_number,
          company_registration_number,
          notes,
          created_at
        `,
        )
        .eq("billing_month", resolvedBillingMonth),
      supabase
        .from("bulk_account_invoices")
        .select(
          `
          id,
          account_number,
          company_name,
          invoice_number,
          invoice_date,
          billing_month,
          total_amount,
          line_items,
          client_address,
          customer_vat_number,
          company_registration_number,
          notes,
          created_at
        `,
        )
        .eq("billing_month", resolvedBillingMonth),
      supabase
        .from("account_invoice_payments")
        .select(
          `
          id,
          account_number,
          billing_month,
          invoice_number,
          amount,
          payment_date,
          payment_reference,
          notes,
          created_at
        `,
        )
        .eq("billing_month", resolvedBillingMonth),
      supabase
        .from("imported_account_payments")
        .select(
          `
          id,
          account_number,
          billing_month_applied_to,
          amount,
          payment_date,
          reference,
          notes,
          created_at
        `,
        )
        .eq("billing_month_applied_to", resolvedBillingMonth),
      supabase
        .from("credit_notes")
        .select(
          `
          id,
          account_number,
          billing_month_applies_to,
          amount,
          applied_amount,
          unapplied_amount,
          status,
          credit_note_date,
          created_at
        `,
        )
        .eq("billing_month_applies_to", resolvedBillingMonth),
    ]);

    const firstError =
      costCentersError ||
      mirrorError ||
      accountInvoicesError ||
      bulkInvoicesError ||
      ledgerPaymentsError ||
      importedPaymentsError ||
      creditNotesError;

    if (firstError) {
      console.error("Error fetching receivables overview:", firstError);
      return NextResponse.json(
        { error: firstError.message || "Failed to load receivables overview" },
        { status: 500 },
      );
    }

    const costCenterInfoByAccount = new Map<
      string,
      {
        company: string | null;
        legalName: string | null;
      }
    >();

    (costCenters || []).forEach((costCenter) => {
      const key = normalizeKey(costCenter.cost_code);
      if (!key) return;
      costCenterInfoByAccount.set(key, {
        company: String(costCenter.company || "").trim() || null,
        legalName: String(costCenter.legal_name || "").trim() || null,
      });
    });

    const mirrorByAccount = new Map<string, Record<string, unknown>>();
    const mirrorRowsByAccount = new Map<string, Record<string, unknown>[]>();
    (mirrorRows || []).forEach((row) => {
      const key = normalizeKey(row.cost_code);
      if (!key) return;
      const current = mirrorRowsByAccount.get(key) || [];
      current.push(row);
      mirrorRowsByAccount.set(key, current);
    });

    mirrorRowsByAccount.forEach((rows, key) => {
      const exactMonthRows = rows.filter(
        (row) => normalizeBillingMonth(row.billing_month) === resolvedBillingMonth,
      );

      const preferredExact =
        exactMonthRows.find((row) => hasMeaningfulAgeAnalysis(row)) || exactMonthRows[0] || null;
      const preferredPrior =
        rows.find((row) => hasMeaningfulAgeAnalysis(row)) || rows[0] || null;

      const preferredRow = preferredExact || preferredPrior;
      if (preferredRow) {
        mirrorByAccount.set(key, preferredRow);
      }
    });

    const accountInvoicesByAccount = new Map<string, Record<string, unknown>[]>();
    (accountInvoices || []).forEach((invoice) => {
      const key = normalizeKey(invoice.account_number);
      if (!key) return;
      const current = accountInvoicesByAccount.get(key) || [];
      current.push(invoice);
      accountInvoicesByAccount.set(key, current);
    });

    const bulkInvoicesByAccount = new Map<string, Record<string, unknown>[]>();
    (bulkInvoices || []).forEach((invoice) => {
      const key = normalizeKey(invoice.account_number);
      if (!key) return;
      const current = bulkInvoicesByAccount.get(key) || [];
      current.push(invoice);
      bulkInvoicesByAccount.set(key, current);
    });

    const paymentStatsByAccount = new Map<
      string,
      {
        count: number;
        total: number;
        lastPaymentDate: string | null;
        lastPaymentReference: string | null;
        hasImportedLedgerPayments: boolean;
      }
    >();

    (ledgerPayments || []).forEach((payment) => {
      const key = normalizeKey(payment.account_number);
      if (!key) return;
      const current = paymentStatsByAccount.get(key) || {
        count: 0,
        total: 0,
        lastPaymentDate: null,
        lastPaymentReference: null,
        hasImportedLedgerPayments: false,
      };

      const paymentDate = String(payment.payment_date || payment.created_at || "").trim() || null;
      const paymentReference = String(payment.payment_reference || "").trim() || null;
      const isLatest =
        new Date(paymentDate || 0).getTime() >= new Date(current.lastPaymentDate || 0).getTime();

      paymentStatsByAccount.set(key, {
        count: current.count + 1,
        total: current.total + toNumber(payment.amount),
        lastPaymentDate: isLatest ? paymentDate : current.lastPaymentDate,
        lastPaymentReference: isLatest ? paymentReference : current.lastPaymentReference,
        hasImportedLedgerPayments:
          current.hasImportedLedgerPayments ||
          String(payment.notes || "").includes("Imported from March Receipts sheet"),
      });
    });

    (importedPayments || []).forEach((payment) => {
      const key = normalizeKey(payment.account_number);
      if (!key) return;
      const current = paymentStatsByAccount.get(key) || {
        count: 0,
        total: 0,
        lastPaymentDate: null,
        lastPaymentReference: null,
        hasImportedLedgerPayments: false,
      };

      if (current.hasImportedLedgerPayments) return;

      const paymentDate = String(payment.payment_date || payment.created_at || "").trim() || null;
      const paymentReference = String(payment.reference || "").trim() || null;
      const isLatest =
        new Date(paymentDate || 0).getTime() >= new Date(current.lastPaymentDate || 0).getTime();

      paymentStatsByAccount.set(key, {
        count: current.count + 1,
        total: current.total + toNumber(payment.amount),
        lastPaymentDate: isLatest ? paymentDate : current.lastPaymentDate,
        lastPaymentReference: isLatest ? paymentReference : current.lastPaymentReference,
        hasImportedLedgerPayments: current.hasImportedLedgerPayments,
      });
    });

    const creditStatsByAccount = new Map<
      string,
      {
        unappliedCredit: number;
        appliedCredit: number;
      }
    >();

    (creditNotes || []).forEach((note) => {
      const key = normalizeKey(note.account_number);
      if (!key) return;
      const current = creditStatsByAccount.get(key) || {
        unappliedCredit: 0,
        appliedCredit: 0,
      };

      creditStatsByAccount.set(key, {
        unappliedCredit: current.unappliedCredit + toNumber(note.unapplied_amount),
        appliedCredit: current.appliedCredit + toNumber(note.applied_amount),
      });
    });

    const accountKeys = new Set<string>([
      ...Array.from(costCenterInfoByAccount.keys()),
      ...Array.from(mirrorByAccount.keys()),
      ...Array.from(accountInvoicesByAccount.keys()),
      ...Array.from(bulkInvoicesByAccount.keys()),
      ...Array.from(paymentStatsByAccount.keys()),
      ...Array.from(creditStatsByAccount.keys()),
    ]);

    const jobStatsByAccount = new Map<
      string,
      {
        openCount: number;
        openValue: number;
        closedCount: number;
        closedValue: number;
      }
    >();

    const accountNumbers = Array.from(accountKeys);
    if (accountNumbers.length > 0) {
      const { data: jobCards, error: jobCardsError } = await supabase
        .from("job_cards")
        .select(
          `
          id,
          new_account_number,
          status,
          job_status,
          job_date,
          completion_date,
          end_time,
          created_at,
          updated_at,
          quotation_products,
          quotation_total_amount,
          estimated_cost
        `,
        )
        .in("new_account_number", accountNumbers);

      if (jobCardsError) {
        console.error("Error fetching receivables job cards:", jobCardsError);
      } else {
        (jobCards || []).forEach((job) => {
          const accountKey = normalizeKey(job.new_account_number);
          if (!accountKey) return;

          const closed = isClosedJob(job);
          const relevantDate = closed
            ? job.completion_date || job.end_time || job.updated_at || job.job_date || job.created_at
            : job.job_date || job.created_at || job.updated_at;

          if (!isInBillingMonth(relevantDate, resolvedBillingMonth)) {
            return;
          }

          const current = jobStatsByAccount.get(accountKey) || {
            openCount: 0,
            openValue: 0,
            closedCount: 0,
            closedValue: 0,
          };
          const jobValue = getJobValue(job);

          if (closed) {
            current.closedCount += 1;
            current.closedValue += jobValue;
          } else {
            current.openCount += 1;
            current.openValue += jobValue;
          }

          jobStatsByAccount.set(accountKey, current);
        });
      }
    }

    const rows = Array.from(accountKeys)
      .map((accountNumber) => {
        const mirror = mirrorByAccount.get(accountNumber) || null;
        const costCenterInfo = costCenterInfoByAccount.get(accountNumber) || null;
        const accountInvoiceRows = (accountInvoicesByAccount.get(accountNumber) || []).sort(sortInvoices);
        const bulkInvoiceRows = (bulkInvoicesByAccount.get(accountNumber) || []).sort(sortInvoices);
        const effectiveInvoices =
          accountInvoiceRows.length > 0
            ? accountInvoiceRows
            : bulkInvoiceRows;
        const leadInvoice = effectiveInvoices[0] || null;
        const paymentStats = paymentStatsByAccount.get(accountNumber) || {
          count: 0,
          total: 0,
          lastPaymentDate: null,
          lastPaymentReference: null,
          hasImportedLedgerPayments: false,
        };
        const creditStats = creditStatsByAccount.get(accountNumber) || {
          unappliedCredit: 0,
          appliedCredit: 0,
        };
        const jobStats = jobStatsByAccount.get(accountNumber) || {
          openCount: 0,
          openValue: 0,
          closedCount: 0,
          closedValue: 0,
        };

        const mirrorOutstanding =
          getMirrorOutstanding(mirror) || getMirrorAgingTotal(mirror);
        const normalizedAging = normalizeAgingBucketsToOutstanding(
          mirror,
          mirrorOutstanding,
        );
        const openAnnuity = toNumber(normalizedAging.current_due);
        const days30 = toNumber(normalizedAging.overdue_30_days);
        const days60 = toNumber(normalizedAging.overdue_60_days);
        const days90 = toNumber(normalizedAging.overdue_90_days);
        const days120 = toNumber(normalizedAging.overdue_120_plus_days);
        const totalOutstanding =
          toNumber(normalizedAging.outstanding_balance) ||
          mirrorOutstanding ||
          openAnnuity + days30 + days60 + days90 + days120;
        const totalInvoiced =
          effectiveInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total_amount), 0) ||
          toNumber(mirror?.due_amount) ||
          toNumber(mirror?.amount_due);

        const company = String(
          mirror?.company ||
          leadInvoice?.company_name ||
          costCenterInfo?.company ||
          costCenterInfo?.legalName ||
          "",
        ).trim() || accountNumber;

        const invoiceStatuses = accountInvoiceRows.map((invoice) => String(invoice.payment_status || ""));

        return {
          accountNumber,
          company,
          openAnnuity,
          days30,
          days60,
          days90,
          days120,
          paymentsCount: paymentStats.count,
          paymentsTotal: Number(paymentStats.total.toFixed(2)),
          lastPaymentDate: paymentStats.lastPaymentDate,
          lastPaymentReference: paymentStats.lastPaymentReference,
          invoices: effectiveInvoices.map((invoice) => ({
            id: invoice.id,
            account_number: invoice.account_number || accountNumber,
            invoice_number: invoice.invoice_number || null,
            invoice_date: invoice.invoice_date || null,
            billing_month: invoice.billing_month || resolvedBillingMonth,
            total_amount: Number(invoice.total_amount || 0),
            paid_amount: Number(invoice.paid_amount || 0),
            balance_due: Number(invoice.balance_due || 0),
            payment_status: invoice.payment_status || null,
            company_name: invoice.company_name || company,
            customer_vat_number: invoice.customer_vat_number || null,
            company_registration_number: invoice.company_registration_number || null,
            client_address: invoice.client_address || null,
            notes: invoice.notes || "",
            line_items: Array.isArray(invoice.line_items) ? invoice.line_items : [],
          })),
          paymentState: buildPaymentState({
            outstanding: totalOutstanding,
            paymentsTotal: paymentStats.total,
            creditAmount: toNumber(mirror?.credit_amount) + creditStats.unappliedCredit,
            invoiceStatuses,
            rawStatus: accountInvoiceRows[0]?.payment_status || mirror?.payment_status,
          }),
          rawPaymentStatus:
            String(accountInvoiceRows[0]?.payment_status || mirror?.payment_status || "").trim() || null,
          openJobCount: jobStats.openCount,
          openJobValue: Number(jobStats.openValue.toFixed(2)),
          closedJobCount: jobStats.closedCount,
          closedJobValue: Number(jobStats.closedValue.toFixed(2)),
          totalAmount: Number(totalOutstanding.toFixed(2)),
          invoiceTotal: Number(totalInvoiced.toFixed(2)),
          creditAmount: Number((toNumber(mirror?.credit_amount) + creditStats.unappliedCredit).toFixed(2)),
        };
      })
      .filter((row) => {
        if (!search) return true;

        return (
          row.accountNumber.includes(search) ||
          row.company.toUpperCase().includes(search) ||
          row.invoices.some((invoice) =>
            String(invoice.invoice_number || "").toUpperCase().includes(search),
          ) ||
          String(row.lastPaymentReference || "").toUpperCase().includes(search)
        );
      })
      .sort((left, right) => {
        const companyCompare = left.company.localeCompare(right.company, "en", {
          sensitivity: "base",
        });
        if (companyCompare !== 0) return companyCompare;
        return left.accountNumber.localeCompare(right.accountNumber, "en", {
          sensitivity: "base",
        });
      });

    const summary = rows.reduce(
      (acc, row) => ({
        accounts: acc.accounts + 1,
        openAnnuity: acc.openAnnuity + row.openAnnuity,
        days30: acc.days30 + row.days30,
        days60: acc.days60 + row.days60,
        days90: acc.days90 + row.days90,
        days120: acc.days120 + row.days120,
        paymentsTotal: acc.paymentsTotal + row.paymentsTotal,
        invoiceTotal: acc.invoiceTotal + row.invoiceTotal,
        totalAmount: acc.totalAmount + row.totalAmount,
        creditAmount: acc.creditAmount + row.creditAmount,
        openJobCount: acc.openJobCount + row.openJobCount,
        openJobValue: acc.openJobValue + row.openJobValue,
        closedJobCount: acc.closedJobCount + row.closedJobCount,
        closedJobValue: acc.closedJobValue + row.closedJobValue,
      }),
      {
        accounts: 0,
        openAnnuity: 0,
        days30: 0,
        days60: 0,
        days90: 0,
        days120: 0,
        paymentsTotal: 0,
        invoiceTotal: 0,
        totalAmount: 0,
        creditAmount: 0,
        openJobCount: 0,
        openJobValue: 0,
        closedJobCount: 0,
        closedJobValue: 0,
      },
    );

    return NextResponse.json({
      rows,
      resolvedBillingMonth,
      summary: {
        accounts: summary.accounts,
        openAnnuity: Number(summary.openAnnuity.toFixed(2)),
        days30: Number(summary.days30.toFixed(2)),
        days60: Number(summary.days60.toFixed(2)),
        days90: Number(summary.days90.toFixed(2)),
        days120: Number(summary.days120.toFixed(2)),
        paymentsTotal: Number(summary.paymentsTotal.toFixed(2)),
        invoiceTotal: Number(summary.invoiceTotal.toFixed(2)),
        totalAmount: Number(summary.totalAmount.toFixed(2)),
        creditAmount: Number(summary.creditAmount.toFixed(2)),
        openJobCount: summary.openJobCount,
        openJobValue: Number(summary.openJobValue.toFixed(2)),
        closedJobCount: summary.closedJobCount,
        closedJobValue: Number(summary.closedJobValue.toFixed(2)),
      },
      total: rows.length,
    });
  } catch (error) {
    console.error("Error in accounts receivables GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
