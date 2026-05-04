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

const composePostalAddress = (...parts: unknown[]) =>
  parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

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

const getPreviousBillingMonth = (billingMonth: string | null | undefined) => {
  const normalized = normalizeBillingMonth(billingMonth);
  if (!normalized) return null;

  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() - 1);
  return normalizeBillingMonth(date.toISOString()) || null;
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

const getLatestMeaningfulMirrorMonth = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  maxBillingMonth?: string | null,
) => {
  let query = supabase
    .from("payments_")
    .select(
      `
      billing_month,
      current_due,
      overdue_30_days,
      overdue_60_days,
      overdue_90_days,
      overdue_120_plus_days,
      outstanding_balance,
      paid_amount,
      credit_amount,
      last_updated
    `,
    )
    .order("billing_month", { ascending: false })
    .order("last_updated", { ascending: false, nullsFirst: false })
    .limit(2000);

  if (maxBillingMonth) {
    query = query.lte("billing_month", maxBillingMonth);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const firstMeaningfulRow = (data || []).find((row) => hasMeaningfulAgeAnalysis(row));
  return normalizeBillingMonth(firstMeaningfulRow?.billing_month) || null;
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

const AGE_ROLLOVER_REFERENCE = "AGE-ROLLFORWARD";

const isMissingRelationError = (error: unknown, relationName: string) => {
  const code = String((error as { code?: unknown })?.code || "").trim().toUpperCase();
  const relation = String(relationName || "").trim().toLowerCase();
  const message = String((error as { message?: unknown })?.message || "").toLowerCase();
  const details = String((error as { details?: unknown })?.details || "").toLowerCase();
  const hint = String((error as { hint?: unknown })?.hint || "").toLowerCase();
  const combined = `${message} ${details} ${hint}`;

  if (code === "42P01") {
    return true;
  }

  if (code === "PGRST205" && combined.includes(relation)) {
    return true;
  }

  return combined.includes("does not exist") && combined.includes(relation);
};

const isMissingFunctionError = (error: unknown, functionName: string) => {
  const code = String((error as { code?: unknown })?.code || "").trim().toUpperCase();
  const fn = String(functionName || "").trim().toLowerCase();
  const message = String((error as { message?: unknown })?.message || "").toLowerCase();
  const details = String((error as { details?: unknown })?.details || "").toLowerCase();
  const hint = String((error as { hint?: unknown })?.hint || "").toLowerCase();
  const combined = `${message} ${details} ${hint}`;

  if (code === "42883" || code === "PGRST202") {
    return true;
  }

  return combined.includes(fn) && combined.includes("function");
};

const aggregateMirrorRows = (rows: Array<Record<string, unknown>>) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const sortedRows = [...rows].sort((left, right) => {
    const leftTime = new Date(
      String(left?.last_updated || left?.invoice_date || left?.billing_month || 0),
    ).getTime();
    const rightTime = new Date(
      String(right?.last_updated || right?.invoice_date || right?.billing_month || 0),
    ).getTime();
    return rightTime - leftTime;
  });

  const latestRow = sortedRows[0];
  const sum = (projector: (row: Record<string, unknown>) => number) =>
    sortedRows.reduce((total, row) => total + projector(row), 0);

  const currentDue = sum((row) => toNumber(row.current_due));
  const overdue30 = sum((row) => toNumber(row.overdue_30_days));
  const overdue60 = sum((row) => toNumber(row.overdue_60_days));
  const overdue90 = sum((row) => toNumber(row.overdue_90_days));
  const overdue120 = sum((row) => toNumber(row.overdue_120_plus_days));
  const outstandingBalance = sum(
    (row) =>
      toNumber(row.outstanding_balance) ||
      toNumber(row.balance_due) ||
      getMirrorAgingTotal(row),
  );

  return {
    ...latestRow,
    current_due: Number(currentDue.toFixed(2)),
    overdue_30_days: Number(overdue30.toFixed(2)),
    overdue_60_days: Number(overdue60.toFixed(2)),
    overdue_90_days: Number(overdue90.toFixed(2)),
    overdue_120_plus_days: Number(overdue120.toFixed(2)),
    due_amount: Number(
      sum((row) => toNumber(row.due_amount) || toNumber(row.amount_due) || toNumber(row.balance_due)).toFixed(2),
    ),
    amount_due: Number(
      sum((row) => toNumber(row.amount_due) || toNumber(row.balance_due) || getMirrorAgingTotal(row)).toFixed(2),
    ),
    balance_due: Number(
      sum((row) => toNumber(row.balance_due) || toNumber(row.outstanding_balance) || getMirrorAgingTotal(row)).toFixed(2),
    ),
    outstanding_balance: Number(outstandingBalance.toFixed(2)),
    paid_amount: Number(sum((row) => toNumber(row.paid_amount)).toFixed(2)),
    credit_amount: Number(sum((row) => toNumber(row.credit_amount)).toFixed(2)),
  };
};

const selectPreferredMirrorRows = (
  rows: Array<Record<string, unknown>>,
  billingMonth: string,
) => {
  const rowsForMonth = rows.filter(
    (row) => normalizeBillingMonth(row.billing_month) === billingMonth,
  );

  if (rowsForMonth.length === 0) {
    return [];
  }

  const rollforwardRows = rowsForMonth.filter(
    (row) => normalizeKey(row.reference) === AGE_ROLLOVER_REFERENCE,
  );
  return rollforwardRows.length > 0 ? rollforwardRows : rowsForMonth;
};

const pickMirrorSnapshot = (
  rows: Array<Record<string, unknown>>,
  billingMonth: string,
) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const exactRows = selectPreferredMirrorRows(rows, billingMonth);
  if (exactRows.length > 0) {
    return aggregateMirrorRows(exactRows);
  }

  const months = Array.from(
    new Set(
      rows
        .map((row) => normalizeBillingMonth(row.billing_month))
        .filter((month): month is string => Boolean(month)),
    ),
  ).sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  for (const month of months) {
    const aggregate = aggregateMirrorRows(selectPreferredMirrorRows(rows, month));
    if (hasMeaningfulAgeAnalysis(aggregate)) {
      return aggregate;
    }
  }

  const fallbackMonth = months[0];
  return fallbackMonth
    ? aggregateMirrorRows(selectPreferredMirrorRows(rows, fallbackMonth))
    : aggregateMirrorRows(rows);
};

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

    const activeBillingMonth = await getLockMonth(supabase);
    const latestMirrorBillingMonth = await getLatestMeaningfulMirrorMonth(
      supabase,
      activeBillingMonth,
    );
    const resolvedBillingMonth =
      requestedBillingMonth ||
      latestMirrorBillingMonth ||
      getPreviousBillingMonth(activeBillingMonth) ||
      activeBillingMonth;
    const { start: billingMonthStart, end: billingMonthEnd } =
      getBillingMonthRange(resolvedBillingMonth);

    const { error: rolloverError } = await supabase.rpc("rollover_age_analysis_month", {
      p_target_billing_month: resolvedBillingMonth,
      p_persist: true,
    });

    if (
      rolloverError &&
      !isMissingFunctionError(rolloverError, "rollover_age_analysis_month")
    ) {
      console.error("Receivables age rollover warning:", rolloverError);
    }

    const [
      { data: costCenters, error: costCentersError },
      { data: mirrorRows, error: mirrorError },
      { data: accountInvoices, error: accountInvoicesError },
      { data: bulkInvoices, error: bulkInvoicesError },
      { data: ledgerPayments, error: ledgerPaymentsError },
      { data: creditNotes, error: creditNotesError },
    ] = await Promise.all([
      supabase
        .from("cost_centers")
        .select(
          `
          cost_code,
          company,
          legal_name,
          contact_name,
          email,
          postal_address_1,
          postal_address_2,
          postal_address_3,
          physical_area,
          physical_code
        `,
        )
        .order("cost_code", { ascending: true }),
      supabase
        .from("payments_")
        .select("*")
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
        .gte("payment_date", billingMonthStart.toISOString())
        .lt("payment_date", billingMonthEnd.toISOString()),
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
      creditNotesError;

    if (firstError) {
      if (isMissingRelationError(firstError, "credit_notes")) {
        console.warn("Receivables credit note table is unavailable; continuing without credit notes.");
      } else {
      console.error("Error fetching receivables overview:", firstError);
      return NextResponse.json(
        { error: firstError.message || "Failed to load receivables overview" },
        { status: 500 },
      );
      }
    }

    const costCenterInfoByAccount = new Map<
      string,
      {
        company: string | null;
        legalName: string | null;
        contactName: string | null;
        email: string | null;
        postalAddress: string | null;
        city: string | null;
        postCode: string | null;
      }
    >();

    (costCenters || []).forEach((costCenter) => {
      const key = normalizeKey(costCenter.cost_code);
      if (!key) return;
      costCenterInfoByAccount.set(key, {
        company: String(costCenter.company || "").trim() || null,
        legalName: String(costCenter.legal_name || "").trim() || null,
        contactName: String(costCenter.contact_name || "").trim() || null,
        email: String(costCenter.email || "").trim() || null,
        postalAddress:
          composePostalAddress(
            costCenter.postal_address_1,
            costCenter.postal_address_2,
            costCenter.postal_address_3,
          ) || null,
        city: String(costCenter.physical_area || "").trim() || null,
        postCode: String(costCenter.physical_code || "").trim() || null,
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
      const snapshot = pickMirrorSnapshot(rows, resolvedBillingMonth);
      if (snapshot) {
        mirrorByAccount.set(key, snapshot);
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
        const clientName = String(
          mirror?.client_name ||
          leadInvoice?.company_name ||
          costCenterInfo?.legalName ||
          company,
        ).trim() || company;
        const contact = String(
          mirror?.client_contact ||
          costCenterInfo?.contactName ||
          "",
        ).trim();
        const email = String(
          mirror?.email ||
          costCenterInfo?.email ||
          "",
        ).trim();
        const postalAddress = String(
          mirror?.postal_address ||
          costCenterInfo?.postalAddress ||
          "",
        ).trim();
        const city = String(
          mirror?.city ||
          costCenterInfo?.city ||
          "",
        ).trim();
        const postCode = String(
          mirror?.post_code ||
          costCenterInfo?.postCode ||
          "",
        ).trim();

        const invoiceStatuses = accountInvoiceRows.map((invoice) => String(invoice.payment_status || ""));

        return {
          accountNumber,
          company,
          clientName,
          contact,
          phone: String(mirror?.phone || "").trim(),
          email,
          accountStatus: String(mirror?.account_status || "").trim(),
          paymentTerms: String(mirror?.payment_terms || "").trim(),
          category: String(mirror?.category || "").trim(),
          postalAddress,
          city,
          region: String(mirror?.region || "").trim(),
          country: String(mirror?.country || "").trim(),
          postCode,
          solutionsRep: String(mirror?.solutions_rep || "").trim(),
          lastPaymentDateForExport:
            String(mirror?.last_payment_date || paymentStats.lastPaymentDate || "").trim() || null,
          lastPaymentAmount: Number(toNumber(mirror?.last_payment).toFixed(2)),
          avgDaysToPay: Number(toNumber(mirror?.avg_days_to_pay).toFixed(2)),
          debtorNote: String(mirror?.debtor_note || "").trim(),
          creditLimit: Number(toNumber(mirror?.credit_limit).toFixed(2)),
          currency: String(mirror?.currency || "ZAR").trim() || "ZAR",
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
      requestedBy:
        String(
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "",
        ).trim() || "Unknown User",
      requestedByEmail: user.email || null,
      exportedAt: new Date().toISOString(),
      organizationName: "Soltrack (PTY) LTD",
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
