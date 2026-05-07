import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  allocateTrackedInvoiceNumber,
  markTrackedInvoiceFailed,
  markTrackedInvoicePersisted,
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
      .maybeSingle();

    if (error) {
      console.error('Error fetching job card invoice:', error);
      return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
    }

    return NextResponse.json({ invoice: data || null });
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
      refreshInvoiceNumber,
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
      .select('id, new_account_number')
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

    const { data: existingInvoice, error: existingError } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_card_id', jobCardId)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing invoice:', existingError);
      return NextResponse.json({ error: 'Failed to check existing invoice' }, { status: 500 });
    }

    const payload = {
      job_card_id: jobCardId,
      job_number: jobNumber || null,
      quotation_number: quotationNumber || null,
      account_number: resolvedAccountNumber,
      client_name: clientName || null,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      client_address: clientAddress || null,
      invoice_date: resolvedInvoiceDate,
      due_date: dueDate || null,
      payment_terms: paymentTerms || null,
      notes: notes || null,
      subtotal: Number(subtotal || 0),
      vat_amount: Number(vatAmount || 0),
      discount_amount: Number(discountAmount || 0),
      total_amount: Number(totalAmount || 0),
      line_items: Array.isArray(lineItems) ? lineItems : [],
    };

    if (existingInvoice?.id) {
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          ...payload,
          invoice_number: existingInvoice.invoice_number,
          created_by: existingInvoice.created_by || user.id,
        })
        .eq('id', existingInvoice.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating invoice:', updateError);
        return NextResponse.json({ error: 'Failed to refresh invoice' }, { status: 500 });
      }

      return NextResponse.json({
        invoice: updatedInvoice,
        reused: true,
        refreshed: Boolean(refreshInvoiceNumber),
      });
    }

    let allocatedInvoiceNumber = '';
    let allocationAuditId: string | null = null;

    try {
      const allocation = await allocateTrackedInvoiceNumber(supabase, {
        source: 'api/invoices/job-card',
        userId: user.id,
        requestKey: jobCardId,
        context: {
          jobCardId,
          jobNumber: jobNumber || null,
          accountNumber: resolvedAccountNumber,
        },
      });
      allocatedInvoiceNumber = allocation.invoiceNumber;
      allocationAuditId = allocation.auditId;
    } catch (allocationError) {
      console.error('Error allocating invoice number:', allocationError);
      return NextResponse.json(
        { error: 'Failed to allocate invoice number' },
        { status: 500 },
      );
    }

    const { data: insertedInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        ...payload,
        invoice_number: allocatedInvoiceNumber,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: conflictingInvoice } = await supabase
          .from('invoices')
          .select('*')
          .eq('job_card_id', jobCardId)
          .maybeSingle();

        if (conflictingInvoice) {
          await markTrackedInvoiceFailed(supabase, {
            auditId: allocationAuditId,
            invoiceNumber: allocatedInvoiceNumber,
            errorMessage:
              'Invoice insert conflicted with an existing row and reused existing invoice',
          });
          return NextResponse.json({ invoice: conflictingInvoice, reused: true });
        }
      }

      console.error('Error inserting invoice:', insertError);
      await markTrackedInvoiceFailed(supabase, {
        auditId: allocationAuditId,
        invoiceNumber: allocatedInvoiceNumber,
        errorMessage: insertError.message || 'Failed to insert invoice',
      });
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    await markTrackedInvoicePersisted(supabase, {
      auditId: allocationAuditId,
      invoiceNumber: allocatedInvoiceNumber,
      persistedTable: 'invoices',
      persistedInvoiceId: insertedInvoice.id,
    });

    return NextResponse.json({ invoice: insertedInvoice, reused: false });
  } catch (error) {
    console.error('Error in invoice job-card POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
