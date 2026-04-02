import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const normalizeBillingMonth = (value: unknown) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

export const getOperationalBillingMonthKey = (date = new Date()) => {
  const operationalDate = new Date(date);
  if (operationalDate.getDate() <= 7) {
    operationalDate.setMonth(operationalDate.getMonth() - 1);
  }
  operationalDate.setDate(1);
  return `${operationalDate.getFullYear()}-${String(operationalDate.getMonth() + 1).padStart(2, "0")}-01`;
};

const toNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const getOutstandingBucketTotal = (source?: Record<string, unknown> | null) =>
  Number(
    (
      toNumber(source?.overdue_30_days) +
      toNumber(source?.overdue_60_days) +
      toNumber(source?.overdue_90_days) +
      toNumber(source?.overdue_120_plus_days)
    ).toFixed(2),
  );

export const applyOutstandingPaymentToBuckets = (
  source: Record<string, unknown> | null | undefined,
  paymentAmount: unknown,
) => {
  let remainingPayment = Math.max(0, toNumber(paymentAmount));
  let overdue120 = Math.max(0, toNumber(source?.overdue_120_plus_days));
  let overdue90 = Math.max(0, toNumber(source?.overdue_90_days));
  let overdue60 = Math.max(0, toNumber(source?.overdue_60_days));
  let overdue30 = Math.max(0, toNumber(source?.overdue_30_days));
  const currentDue = Math.max(0, toNumber(source?.current_due));

  const consume = (bucketValue: number) => {
    if (remainingPayment <= 0 || bucketValue <= 0) {
      return bucketValue;
    }

    const applied = Math.min(bucketValue, remainingPayment);
    remainingPayment = Number((remainingPayment - applied).toFixed(2));
    return Number((bucketValue - applied).toFixed(2));
  };

  overdue120 = consume(overdue120);
  overdue90 = consume(overdue90);
  overdue60 = consume(overdue60);
  overdue30 = consume(overdue30);

  const remainingOutstanding = Number(
    (currentDue + overdue30 + overdue60 + overdue90 + overdue120).toFixed(2),
  );
  const appliedToOutstanding = Number(
    (Math.max(0, toNumber(paymentAmount)) - remainingPayment).toFixed(2),
  );

  return {
    current_due: currentDue,
    overdue_30_days: overdue30,
    overdue_60_days: overdue60,
    overdue_90_days: overdue90,
    overdue_120_plus_days: overdue120,
    outstanding_balance: remainingOutstanding,
    appliedToOutstanding,
    creditAmount: Number(remainingPayment.toFixed(2)),
  };
};

export const calculateOverdueBuckets = ({
  balanceDue,
  dueDate,
}: {
  balanceDue: unknown;
  dueDate?: string | null;
}) => {
  const outstanding = Math.max(0, toNumber(balanceDue));
  if (outstanding <= 0 || !dueDate) {
    return {
      overdue30Days: 0,
      overdue60Days: 0,
      overdue90Days: 0,
      overdue91PlusDays: 0,
      currentDue: outstanding,
      daysOverdue: 0,
    };
  }

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return {
      overdue30Days: 0,
      overdue60Days: 0,
      overdue90Days: 0,
      overdue91PlusDays: 0,
      currentDue: outstanding,
      daysOverdue: 0,
    };
  }

  const today = new Date();
  const diffMs = today.setHours(0, 0, 0, 0) - due.setHours(0, 0, 0, 0);
  const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (daysOverdue <= 0) {
    return {
      overdue30Days: 0,
      overdue60Days: 0,
      overdue90Days: 0,
      overdue91PlusDays: 0,
      currentDue: outstanding,
      daysOverdue: 0,
    };
  }

  return {
    overdue30Days: daysOverdue <= 30 ? outstanding : 0,
    overdue60Days: daysOverdue >= 31 && daysOverdue <= 60 ? outstanding : 0,
    overdue90Days: daysOverdue >= 61 && daysOverdue <= 90 ? outstanding : 0,
    overdue91PlusDays: daysOverdue > 90 ? outstanding : 0,
    currentDue: 0,
    daysOverdue,
  };
};

export const defaultDueDate = (invoiceDate: unknown) => {
  const parsed = new Date(String(invoiceDate || new Date().toISOString()));
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  parsed.setDate(parsed.getDate() + 30);
  return parsed.toISOString().slice(0, 10);
};

export const getPaymentStatus = ({
  balanceDue,
  paidAmount,
  dueDate,
}: {
  balanceDue: number;
  paidAmount: number;
  dueDate?: string | null;
}) => {
  if (balanceDue <= 0) {
    return "paid";
  }

  const today = new Date();
  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  const isOverdue =
    parsedDueDate &&
    !Number.isNaN(parsedDueDate.getTime()) &&
    parsedDueDate.getTime() < today.setHours(0, 0, 0, 0);

  if (paidAmount > 0) {
    return isOverdue ? "overdue" : "partial";
  }

  return isOverdue ? "overdue" : "pending";
};

export const buildInvoiceFinancials = ({
  totalAmount,
  paidAmount,
  dueDate,
}: {
  totalAmount: unknown;
  paidAmount?: unknown;
  dueDate?: string | null;
}) => {
  const total = toNumber(totalAmount);
  const paid = Math.max(0, toNumber(paidAmount));
  const balance = Math.max(0, total - paid);
  return {
    totalAmount: total,
    paidAmount: paid,
    balanceDue: balance,
    paymentStatus: getPaymentStatus({
      balanceDue: balance,
      paidAmount: paid,
      dueDate,
    }),
  };
};

export const buildDraftPaymentsFromVehicles = (
  vehicles: Array<Record<string, unknown>> = [],
) => {
  const currentBillingMonth = new Date();
  currentBillingMonth.setDate(1);
  const billingMonth = currentBillingMonth.toISOString().slice(0, 10);

  const draftByCode = new Map<
    string,
    {
      company: string;
      cost_code: string;
      account_invoice_id: null;
      invoice_number: null;
      reference: string;
      due_amount: number;
      paid_amount: number;
      balance_due: number;
      invoice_date: null;
      due_date: null;
      payment_status: string;
      current_due: number;
      overdue_30_days: number;
      overdue_60_days: number;
      overdue_90_days: number;
      overdue_120_plus_days: number;
      outstanding_balance: number;
      last_updated: string;
      billing_month: string;
      source: string;
    }
  >();

  vehicles.forEach((vehicle) => {
    const costCode = String(
      vehicle?.new_account_number || vehicle?.account_number || '',
    )
      .trim()
      .toUpperCase();
    if (!costCode) return;

    const totalRental = toNumber(vehicle?.total_rental);
    const totalSub = toNumber(vehicle?.total_sub);
    const dueAmountExVat = totalRental + totalSub;
    if (dueAmountExVat <= 0) return;
    const dueAmount = Number((dueAmountExVat * 1.15).toFixed(2));

    const existing = draftByCode.get(costCode);
    if (existing) {
      existing.due_amount += dueAmount;
      existing.balance_due += dueAmount;
      if (!existing.company && vehicle?.company) {
        existing.company = String(vehicle.company);
      }
      return;
    }

    draftByCode.set(costCode, {
      company: String(vehicle?.company || ''),
      cost_code: costCode,
      account_invoice_id: null,
      invoice_number: null,
      reference: '',
      due_amount: dueAmount,
      paid_amount: 0,
      balance_due: dueAmount,
      invoice_date: null,
      due_date: null,
      payment_status: 'pending',
      current_due: dueAmount,
      overdue_30_days: 0,
      overdue_60_days: 0,
      overdue_90_days: 0,
      overdue_120_plus_days: 0,
      outstanding_balance: dueAmount,
      last_updated: new Date().toISOString(),
      billing_month: billingMonth,
      source: 'vehicles_draft',
    });
  });

  return draftByCode;
};

export const upsertPaymentsMirror = async (
  supabase: SupabaseClient,
  invoice: {
    id: string;
    account_number: string;
    billing_month?: string | null;
    invoice_number: string;
    company_name?: string | null;
    invoice_date?: string | null;
    due_date?: string | null;
    total_amount?: number | null;
    paid_amount?: number | null;
    balance_due?: number | null;
    payment_status?: string | null;
    last_payment_reference?: string | null;
    updated_at?: string | null;
    credit_amount?: number | null;
  },
) => {
  const isMissingCreditAmountColumnError = (error: unknown) => {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message || "")
        : "";
    return message.includes("credit_amount");
  };

  const billingMonth = normalizeBillingMonth(invoice.billing_month);
  const overdueBuckets = calculateOverdueBuckets({
    balanceDue: invoice.balance_due,
    dueDate: invoice.due_date || null,
  });
  const payload = {
    company: invoice.company_name || "",
    cost_code: invoice.account_number,
    account_invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    reference: invoice.invoice_number,
    due_amount: toNumber(invoice.total_amount),
    paid_amount: toNumber(invoice.paid_amount),
    balance_due: toNumber(invoice.balance_due),
    payment_status: invoice.payment_status || "pending",
    invoice_date: invoice.invoice_date || new Date().toISOString().slice(0, 10),
    due_date: invoice.due_date || null,
    current_due: overdueBuckets.currentDue,
    overdue_30_days: overdueBuckets.overdue30Days,
    overdue_60_days: overdueBuckets.overdue60Days,
    overdue_90_days: overdueBuckets.overdue90Days,
    overdue_120_plus_days: overdueBuckets.overdue91PlusDays,
    outstanding_balance: toNumber(invoice.balance_due),
    amount_due: toNumber(invoice.balance_due),
    billing_month: billingMonth,
    last_updated: new Date().toISOString(),
  };

  const basePayload = { ...payload };
  let payloadWithCredit = {
    ...basePayload,
    credit_amount: toNumber(invoice.credit_amount ?? 0),
  };

  let existingQuery = supabase
    .from("payments_")
    .select("id, credit_amount")
    .eq("cost_code", invoice.account_number)
    .limit(1);

  existingQuery = billingMonth
    ? existingQuery.eq("billing_month", billingMonth)
    : existingQuery.is("billing_month", null);

  let { data: existingRows, error: existingError } = await existingQuery;
  if (existingError && isMissingCreditAmountColumnError(existingError)) {
    let fallbackQuery = supabase
      .from("payments_")
      .select("id")
      .eq("cost_code", invoice.account_number)
      .limit(1);

    fallbackQuery = billingMonth
      ? fallbackQuery.eq("billing_month", billingMonth)
      : fallbackQuery.is("billing_month", null);

    const fallbackResult = await fallbackQuery;
    existingRows = fallbackResult.data;
    existingError = fallbackResult.error;
    payloadWithCredit = basePayload;
  }
  if (existingError) {
    throw existingError;
  }

  const existingPayment = Array.isArray(existingRows) ? existingRows[0] || null : null;
  const creditAmount =
    invoice.credit_amount ??
    (typeof existingPayment === "object" && existingPayment !== null && "credit_amount" in existingPayment
      ? (existingPayment as { credit_amount?: unknown }).credit_amount
      : 0) ??
    0;
  if ("credit_amount" in payloadWithCredit) {
    payloadWithCredit.credit_amount = toNumber(creditAmount);
  }

  if (existingPayment?.id) {
    let { error: updateError } = await supabase
      .from("payments_")
      .update(payloadWithCredit)
      .eq("id", existingPayment.id);

    if (updateError && isMissingCreditAmountColumnError(updateError)) {
      const { error: fallbackUpdateError } = await supabase
        .from("payments_")
        .update(basePayload)
        .eq("id", existingPayment.id);
      updateError = fallbackUpdateError;
    }

    if (updateError) {
      throw updateError;
    }
    return;
  }

  let { error: insertError } = await supabase.from("payments_").insert(payloadWithCredit);
  if (insertError && isMissingCreditAmountColumnError(insertError)) {
    const fallbackInsert = await supabase.from("payments_").insert(basePayload);
    insertError = fallbackInsert.error;
  }
  if (insertError) {
    throw insertError;
  }
};

export const resolveAccountInvoice = async (
  supabase: SupabaseClient,
  {
    accountInvoiceId,
    accountNumber,
    billingMonth,
  }: {
    accountInvoiceId?: string | null;
    accountNumber?: string | null;
    billingMonth?: string | null;
  },
) => {
  if (accountInvoiceId) {
    const { data, error } = await supabase
      .from("account_invoices")
      .select("*")
      .eq("id", accountInvoiceId)
      .single();

    if (error) throw error;
    return data;
  }

  if (!accountNumber) {
    return null;
  }

  let query = supabase
    .from("account_invoices")
    .select("*")
    .eq("account_number", accountNumber)
    .order("billing_month", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1);

  query = billingMonth
    ? query.eq("billing_month", normalizeBillingMonth(billingMonth))
    : query;

  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : null;
};
