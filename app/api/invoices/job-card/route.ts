import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createAtomicInvoice,
} from "@/lib/server/invoice-number-audit";

const SYSTEM_LOCK_KEY = 'billing';
const BUSINESS_TIME_ZONE = 'Africa/Johannesburg';

const getSystemLock = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
) => {
  const { data, error } = await supabase
    .from('system_locks')
    .select('*')
    .eq('lock_key', SYSTEM_LOCK_KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
};

const getLockMonthEndInvoiceDate = (
  lockDate: unknown,
  referenceBillingDate?: unknown,
) => {
  const raw = String(lockDate || '').trim();
  if (!raw) return null;

  const referenceRaw = String(referenceBillingDate || '').trim();
  const referenceYear = /^\d{4}/.test(referenceRaw)
    ? referenceRaw.slice(0, 4)
    : raw.slice(0, 4);
  const lockMonth = `${referenceYear}-${raw.slice(5, 7)}-01T00:00:00`;
  const parsed = new Date(lockMonth);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = parsed.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const invoiceDay = Math.min(30, lastDay);
  const lockMonthDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(invoiceDay).padStart(2, '0')}`;
  return new Date(`${lockMonthDate}T12:00:00+02:00`).toISOString();
};

const getBusinessDateString = (value?: unknown) => {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = raw ? new Date(raw) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
};

const toBusinessMiddayIso = (value?: unknown) => {
  const businessDate = getBusinessDateString(value);
  return new Date(`${businessDate}T12:00:00+02:00`).toISOString();
};

const normalizeBillingToken = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const toNumberValue = (value: unknown) => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractBillingInvoiceIdentity = (billingStatuses: unknown) => {
  if (!billingStatuses || typeof billingStatuses !== 'object') {
    return { invoiceId: '', invoiceNumber: '' };
  }

  const invoiceStatus =
    (billingStatuses as Record<string, unknown>)?.invoice &&
    typeof (billingStatuses as Record<string, unknown>).invoice === 'object'
      ? ((billingStatuses as Record<string, unknown>).invoice as Record<
          string,
          unknown
        >)
      : null;

  if (!invoiceStatus) {
    return { invoiceId: '', invoiceNumber: '' };
  }

  const invoiceId = String(invoiceStatus.invoice_id || '').trim();
  const invoiceNumber = String(
    invoiceStatus.invoice_number || invoiceStatus.reference || '',
  ).trim();

  return { invoiceId, invoiceNumber };
};

const isAdminOrRepairFallbackJob = (
  jobCard: Record<string, unknown> | null | undefined,
) => {
  const normalizedJobType = normalizeBillingToken(
    jobCard?.job_type ?? jobCard?.quotation_job_type ?? '',
  );
  const normalizedStatus = normalizeBillingToken(jobCard?.status ?? '');
  return (
    normalizedJobType === 'repair' ||
    normalizedJobType === 'admincreated' ||
    normalizedStatus === 'admincreated'
  );
};

const getAdminOrRepairFallbackSubtotal = (
  jobCard: Record<string, unknown> | null | undefined,
  submittedSubtotal?: unknown,
) => {
  const candidates = [
    submittedSubtotal,
    jobCard?.quotation_total_amount,
    jobCard?.actual_cost,
    jobCard?.estimated_cost,
    jobCard?.quotation_subtotal,
  ];

  for (const candidate of candidates) {
    const amount = toNumberValue(candidate);
    if (amount > 0) {
      return amount;
    }
  }

  return 0;
};

const buildFallbackLineItemsForAdminOrRepair = (
  jobCard: Record<string, unknown> | null | undefined,
  submittedSubtotal?: unknown,
) => {
  if (!isAdminOrRepairFallbackJob(jobCard)) {
    return [] as Record<string, unknown>[];
  }

  const subtotal = getAdminOrRepairFallbackSubtotal(jobCard, submittedSubtotal);
  if (subtotal <= 0) {
    return [] as Record<string, unknown>[];
  }

  const normalizedType = normalizeBillingToken(
    jobCard?.job_type ?? jobCard?.quotation_job_type ?? '',
  );
  const isRepair = normalizedType === 'repair';
  const isAdminCreated = normalizedType === 'admincreated';
  const itemCode = isRepair ? 'REPAIR' : 'ADMIN';
  const itemDescription =
    isRepair || isAdminCreated ? 'Repair Job Charge' : 'Admin Job Charge';
  const comments = String(
    jobCard?.completion_notes ??
      jobCard?.work_notes ??
      jobCard?.job_description ??
      `${itemDescription} for ${String(jobCard?.job_number ?? 'job')}`,
  ).trim();
  const registration = String(
    jobCard?.vehicle_registration ?? jobCard?.temporary_registration ?? 'N/A',
  ).trim();
  const vatAmount = Number((subtotal * 0.15).toFixed(2));
  const totalIncl = Number((subtotal + vatAmount).toFixed(2));

  return [
    {
      previous_reg: registration || 'N/A',
      new_reg: registration || 'N/A',
      item_code: itemCode,
      description: itemDescription,
      comments,
      quantity: 1,
      unit_price: subtotal,
      vat_percent: '15.00%',
      vat_amount: vatAmount,
      total_incl: totalIncl,
    },
  ];
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobCardId = searchParams.get('jobCardId');

    if (!jobCardId) {
      return NextResponse.json({ error: 'jobCardId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_card_id', jobCardId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching job card invoice:', error);
      return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
    }

    let invoice = Array.isArray(data) ? data[0] || null : null;

    if (!invoice) {
      const { data: jobCardMeta, error: jobCardMetaError } = await supabase
        .from('job_cards')
        .select('job_number, billing_statuses')
        .eq('id', jobCardId)
        .maybeSingle();

      if (jobCardMetaError) {
        console.error('Error fetching job card metadata for invoice lookup:', jobCardMetaError);
      } else {
        const {
          invoiceId: billingInvoiceId,
          invoiceNumber: billingInvoiceNumber,
        } = extractBillingInvoiceIdentity(jobCardMeta?.billing_statuses);

        if (billingInvoiceId) {
          const { data: billingFallbackData, error: billingFallbackError } =
            await supabase
              .from('invoices')
              .select('*')
              .eq('id', billingInvoiceId)
              .maybeSingle();

          if (billingFallbackError) {
            console.error(
              'Error fetching fallback invoice by billing invoice_id:',
              billingFallbackError,
            );
          } else {
            invoice = billingFallbackData || null;
          }
        }

        if (!invoice && billingInvoiceNumber) {
          const { data: billingNumberFallbackData, error: billingNumberFallbackError } =
            await supabase
              .from('invoices')
              .select('*')
              .eq('invoice_number', billingInvoiceNumber)
              .order('created_at', { ascending: false })
              .limit(1);

          if (billingNumberFallbackError) {
            console.error(
              'Error fetching fallback invoice by billing invoice_number:',
              billingNumberFallbackError,
            );
          } else {
            invoice = Array.isArray(billingNumberFallbackData)
              ? billingNumberFallbackData[0] || null
              : null;
          }
        }

        const jobNumber = String(jobCardMeta?.job_number || '').trim();
        if (!invoice && jobNumber) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('invoices')
            .select('*')
            .eq('job_number', jobNumber)
            .order('created_at', { ascending: false })
            .limit(1);

          if (fallbackError) {
            console.error('Error fetching fallback invoice by job number:', fallbackError);
          } else {
            invoice = Array.isArray(fallbackData) ? fallbackData[0] || null : null;
          }
        }
      }
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error in invoice job-card GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      jobCardId,
      jobNumber,
      quotationNumber,
      accountNumber,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      invoiceDate,
      dueDate,
      paymentTerms,
      notes,
      subtotal,
      vatAmount,
      discountAmount,
      totalAmount,
      lineItems,
    } = body || {};

    if (!jobCardId) {
      return NextResponse.json({ error: 'jobCardId is required' }, { status: 400 });
    }

    const { data: jobCard, error: jobCardError } = await supabase
      .from('job_cards')
      .select(
        'id, job_number, role, status, job_status, job_type, quotation_job_type, job_description, completion_notes, work_notes, vehicle_registration, temporary_registration, new_account_number, quotation_subtotal, quotation_total_amount, actual_cost, estimated_cost, completion_date, end_time, updated_at, job_date, billing_statuses',
      )
      .eq('id', jobCardId)
      .maybeSingle();

    if (jobCardError) {
      console.error('Error fetching job card for invoice creation:', jobCardError);
      return NextResponse.json({ error: 'Failed to fetch job card' }, { status: 500 });
    }

    const resolvedAccountNumber = String(
      accountNumber || jobCard?.new_account_number || '',
    )
      .trim()
      .toUpperCase();

    if (!resolvedAccountNumber) {
      return NextResponse.json(
        {
          error:
            'Missing account number for invoice. Assign a cost center to this job card before generating an invoice.',
        },
        { status: 400 },
      );
    }

    const systemLock = await getSystemLock(supabase);
    const isSystemLocked = Boolean(systemLock?.is_locked);
    const businessNowInvoiceDate = toBusinessMiddayIso();
    const lockReferenceDate =
      invoiceDate ||
      dueDate ||
      businessNowInvoiceDate;
    const resolvedInvoiceDate =
      (isSystemLocked
        ? getLockMonthEndInvoiceDate(systemLock?.lock_date, lockReferenceDate)
        : null) ||
      (invoiceDate ? toBusinessMiddayIso(invoiceDate) : businessNowInvoiceDate);

    const submittedLineItems = Array.isArray(lineItems)
      ? lineItems.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === 'object' && !Array.isArray(item),
        )
      : [];
    const fallbackLineItems =
      submittedLineItems.length === 0
        ? buildFallbackLineItemsForAdminOrRepair(
            jobCard as Record<string, unknown> | null | undefined,
            subtotal,
          )
        : [];
    const resolvedLineItems =
      submittedLineItems.length > 0 ? submittedLineItems : fallbackLineItems;

    const submittedSubtotal = toNumberValue(subtotal);
    const submittedVatAmount = toNumberValue(vatAmount);
    const submittedDiscountAmount = toNumberValue(discountAmount);
    const submittedTotalAmount = toNumberValue(totalAmount);

    const resolvedSubtotal =
      submittedLineItems.length > 0
        ? submittedSubtotal
        : fallbackLineItems.length > 0
          ? toNumberValue(fallbackLineItems[0]?.unit_price)
          : submittedSubtotal;
    const resolvedVatAmount =
      submittedLineItems.length > 0
        ? submittedVatAmount
        : fallbackLineItems.length > 0
          ? toNumberValue(fallbackLineItems[0]?.vat_amount)
          : submittedVatAmount;
    const resolvedDiscountAmount =
      submittedLineItems.length > 0 ? submittedDiscountAmount : 0;
    const resolvedTotalAmount =
      submittedLineItems.length > 0
        ? submittedTotalAmount
        : fallbackLineItems.length > 0
          ? toNumberValue(fallbackLineItems[0]?.total_incl)
          : submittedTotalAmount;

    // Atomic: allocate number + insert invoice in one transaction. No gaps, no PENDING.
    const { invoice: insertedInvoice, reused } = await createAtomicInvoice(supabase, {
      source: 'api/invoices/job-card',
      requestKey: jobCardId,
      userId: user.id,
      jobCardId,
      jobNumber: jobNumber || null,
      quotationNumber: quotationNumber || null,
      accountNumber: resolvedAccountNumber,
      clientName: clientName || null,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      clientAddress: clientAddress || null,
      invoiceDate: resolvedInvoiceDate,
      dueDate: dueDate || null,
      paymentTerms: paymentTerms || null,
      notes: notes || null,
      subtotal: resolvedSubtotal,
      vatAmount: resolvedVatAmount,
      discountAmount: resolvedDiscountAmount,
      totalAmount: resolvedTotalAmount,
      lineItems: resolvedLineItems,
    });

    return NextResponse.json({ invoice: insertedInvoice, reused });
  } catch (error) {
    console.error('Error in invoice job-card POST:', error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('unique constraint') || message.includes('duplicate key')) {
      return NextResponse.json({ error: 'An invoice already exists for this job card. Please refresh and try again.' }, { status: 409 });
    }
    if (message.includes('foreign key')) {
      return NextResponse.json({ error: 'Job card not found. Please refresh and try again.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create invoice. Please try again.' }, { status: 500 });
  }
}
