import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SYSTEM_LOCK_KEY = 'billing';

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

    const systemLock = await getSystemLock(supabase);
    const isSystemLocked = Boolean(systemLock?.is_locked);

    if (isSystemLocked) {
      const payload = {
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
      };

      const { data: queuedInvoice, error: queueError } = await supabase
        .from('job_card_invoice_queue')
        .upsert(
          {
            job_card_id: jobCardId,
            job_number: jobNumber || null,
            payload,
            status: 'pending',
            queued_by: user.id,
            queued_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'job_card_id' },
        )
        .select('*')
        .single();

      if (queueError) {
        console.error('Error queuing job card invoice:', queueError);
        return NextResponse.json({ error: 'Failed to queue invoice' }, { status: 500 });
      }

      return NextResponse.json({
        queued: true,
        lock: {
          is_locked: true,
          lock_date: systemLock?.lock_date || null,
        },
        queue: queuedInvoice,
      });
    }

    const { data: existingInvoice, error: existingError } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_card_id', jobCardId)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing invoice:', existingError);
      return NextResponse.json({ error: 'Failed to check existing invoice' }, { status: 500 });
    }

    if (existingInvoice && !refreshInvoiceNumber) {
      return NextResponse.json({ invoice: existingInvoice, reused: true });
    }

    const { data: allocatedInvoiceNumber, error: numberError } = await supabase.rpc(
      'allocate_document_number',
      {
        sequence_name: 'invoice',
        prefix: 'INV-',
      },
    );

    if (numberError || !allocatedInvoiceNumber) {
      console.error('Error allocating invoice number:', numberError);
      return NextResponse.json(
        { error: 'Failed to allocate invoice number' },
        { status: 500 },
      );
    }

    const payload = {
      invoice_number: allocatedInvoiceNumber,
      job_card_id: jobCardId,
      job_number: jobNumber || null,
      quotation_number: quotationNumber || null,
      account_number: accountNumber || null,
      client_name: clientName || null,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      client_address: clientAddress || null,
      invoice_date: invoiceDate || new Date().toISOString(),
      due_date: dueDate || null,
      payment_terms: paymentTerms || null,
      notes: notes || null,
      subtotal: Number(subtotal || 0),
      vat_amount: Number(vatAmount || 0),
      discount_amount: Number(discountAmount || 0),
      total_amount: Number(totalAmount || 0),
      line_items: Array.isArray(lineItems) ? lineItems : [],
      created_by: user.id,
    };

    if (existingInvoice && refreshInvoiceNumber) {
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          ...payload,
          created_by: existingInvoice.created_by || user.id,
        })
        .eq('id', existingInvoice.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating invoice:', updateError);
        return NextResponse.json({ error: 'Failed to refresh invoice' }, { status: 500 });
      }

      return NextResponse.json({ invoice: updatedInvoice, reused: false, refreshed: true });
    }

    const { data: insertedInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert(payload)
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
          return NextResponse.json({ invoice: conflictingInvoice, reused: true });
        }
      }

      console.error('Error inserting invoice:', insertError);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    return NextResponse.json({ invoice: insertedInvoice, reused: false });
  } catch (error) {
    console.error('Error in invoice job-card POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
