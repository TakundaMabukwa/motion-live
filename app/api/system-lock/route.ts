import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyQuoteBilling } from '@/app/api/vehicles/apply-quote-billing/route';
import { syncJobEquipmentToVehicles } from '@/app/api/vehicles/sync-job-equipment/route';

const LOCK_KEY = 'billing';

const normalizeLockMonth = (dateValue: string) => {
  if (!dateValue) return null;
  const normalized = `${dateValue.slice(0, 7)}-01`;
  return normalized;
};

const getLockRow = async (supabase: Awaited<ReturnType<typeof createClient>>) => {
  const { data, error } = await supabase
    .from('system_locks')
    .select('*')
    .eq('lock_key', LOCK_KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
};

const enrichLockRow = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  lockRow: Record<string, unknown> | null,
) => {
  if (!lockRow) {
    return null;
  }

  const lockedBy = String(lockRow.locked_by || '').trim();
  if (!lockedBy) {
    return {
      ...lockRow,
      locked_by_email: null,
    };
  }

  const { data: lockedUser } = await supabase
    .from('users')
    .select('email')
    .eq('id', lockedBy)
    .maybeSingle();

  return {
    ...lockRow,
    locked_by_email: lockedUser?.email || null,
  };
};

const applySystemLockToBulkInvoices = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    lockMonth,
    userId,
  }: {
    lockMonth: string;
    userId: string;
  },
) => {
  const { data, error } = await supabase
    .from('bulk_account_invoices')
    .update({
      invoice_locked: true,
      invoice_locked_by: userId,
      invoice_locked_at: new Date().toISOString(),
      system_locked: true,
      system_locked_by: userId,
      system_locked_at: new Date().toISOString(),
      system_locked_date: lockMonth,
    })
    .eq('billing_month', lockMonth)
    .eq('invoice_locked', false)
    .select('id');

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.length : 0;
};

const clearSystemLockFromBulkInvoices = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  { userId }: { userId: string },
) => {
  const { data, error } = await supabase
    .from('bulk_account_invoices')
    .update({
      invoice_locked: false,
      invoice_locked_by: null,
      invoice_locked_at: null,
      system_locked: false,
      system_locked_by: null,
      system_locked_at: null,
      system_locked_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq('system_locked', true)
    .select('id');

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.length : 0;
};

const processQueuedJobCardInvoices = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) => {
  const { data: queuedRows, error } = await supabase
    .from('job_card_invoice_queue')
    .select('*')
    .eq('status', 'pending')
    .order('queued_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = Array.isArray(queuedRows) ? queuedRows : [];
  const results = [];

  for (const row of rows) {
    const jobCardId = row.job_card_id;
    if (!jobCardId) {
      await supabase
        .from('job_card_invoice_queue')
        .update({
          status: 'error',
          error: 'Missing job_card_id',
          processed_at: new Date().toISOString(),
          processed_by: userId,
        })
        .eq('id', row.id);
      continue;
    }

    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('job_card_id', jobCardId)
      .maybeSingle();

    if (existingInvoice?.id) {
      await supabase
        .from('job_card_invoice_queue')
        .update({
          status: 'skipped_existing',
          processed_at: new Date().toISOString(),
          processed_by: userId,
          processed_invoice_id: existingInvoice.id,
        })
        .eq('id', row.id);
      results.push({ id: row.id, status: 'skipped_existing' });
      continue;
    }

    const payload = row.payload || {};

    const { data: allocatedInvoiceNumber, error: numberError } = await supabase.rpc(
      'allocate_document_number',
      {
        sequence_name: 'invoice',
        prefix: 'INV-',
      },
    );

    if (numberError || !allocatedInvoiceNumber) {
      await supabase
        .from('job_card_invoice_queue')
        .update({
          status: 'error',
          error: numberError?.message || 'Failed to allocate invoice number',
          processed_at: new Date().toISOString(),
          processed_by: userId,
        })
        .eq('id', row.id);
      continue;
    }

    const invoicePayload = {
      invoice_number: allocatedInvoiceNumber,
      job_card_id: jobCardId,
      job_number: payload.jobNumber || row.job_number || null,
      quotation_number: payload.quotationNumber || null,
      account_number: payload.accountNumber || null,
      client_name: payload.clientName || null,
      client_email: payload.clientEmail || null,
      client_phone: payload.clientPhone || null,
      client_address: payload.clientAddress || null,
      invoice_date: payload.invoiceDate || new Date().toISOString(),
      due_date: payload.dueDate || null,
      payment_terms: payload.paymentTerms || null,
      notes: payload.notes || null,
      subtotal: Number(payload.subtotal || 0),
      vat_amount: Number(payload.vatAmount || 0),
      discount_amount: Number(payload.discountAmount || 0),
      total_amount: Number(payload.totalAmount || 0),
      line_items: Array.isArray(payload.lineItems) ? payload.lineItems : [],
      created_by: row.queued_by || userId,
    };

    const { data: insertedInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert(invoicePayload)
      .select('*')
      .single();

    if (insertError) {
      await supabase
        .from('job_card_invoice_queue')
        .update({
          status: 'error',
          error: insertError.message || 'Failed to create invoice',
          processed_at: new Date().toISOString(),
          processed_by: userId,
        })
        .eq('id', row.id);
      continue;
    }

    await supabase
      .from('job_card_invoice_queue')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        processed_by: userId,
        processed_invoice_id: insertedInvoice.id,
      })
      .eq('id', row.id);

    if (jobCardId) {
      const { data: jobCard } = await supabase
        .from('job_cards')
        .select('billing_statuses')
        .eq('id', jobCardId)
        .maybeSingle();

      const currentStatuses =
        jobCard?.billing_statuses && typeof jobCard.billing_statuses === 'object'
          ? jobCard.billing_statuses
          : {};

      const nextStatuses = {
        ...currentStatuses,
        invoice: {
          done: true,
          at: new Date().toISOString(),
          invoice_id: insertedInvoice.id,
          invoice_number: insertedInvoice.invoice_number,
          invoice_created_by_user_id: userId,
        },
      };

      await supabase
        .from('job_cards')
        .update({
          billing_statuses: nextStatuses,
          job_status: 'Invoiced',
          status: 'completed',
          invoiced_by: userId,
        })
        .eq('id', jobCardId);
    }

    results.push({ id: row.id, status: 'processed' });
  }

  return results;
};

const processQueuedVehicleBilling = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  lockDate: string | null,
) => {
  if (!lockDate) {
    return [];
  }

  const { data: queuedRows, error } = await supabase
    .from('vehicle_billing_queue')
    .select('*')
    .eq('status', 'pending')
    .eq('lock_date', lockDate)
    .order('queued_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = Array.isArray(queuedRows) ? queuedRows : [];
  const results = [];

  for (const row of rows) {
    try {
      if (row.action_type === 'apply_quote_billing') {
        await applyQuoteBilling(supabase, row.payload || {});
      } else if (row.action_type === 'sync_job_equipment') {
        const payload = row.payload || {};
        await syncJobEquipmentToVehicles(supabase, payload.job || null);
      } else {
        throw new Error(`Unsupported action type: ${row.action_type}`);
      }

      await supabase
        .from('vehicle_billing_queue')
        .update({
          status: 'processed',
          error: null,
          processed_at: new Date().toISOString(),
          processed_by: userId,
        })
        .eq('id', row.id);

      results.push({ id: row.id, status: 'processed', action_type: row.action_type });
    } catch (queueError: any) {
      await supabase
        .from('vehicle_billing_queue')
        .update({
          status: 'error',
          error: queueError?.message || 'Failed to process queued vehicle billing',
          processed_at: new Date().toISOString(),
          processed_by: userId,
        })
        .eq('id', row.id);

      results.push({
        id: row.id,
        status: 'error',
        action_type: row.action_type,
        error: queueError?.message || 'Failed to process queued vehicle billing',
      });
    }
  }

  return results;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lockRow = await getLockRow(supabase);
    const enriched = await enrichLockRow(supabase, lockRow);

    return NextResponse.json({ lock: enriched });
  } catch (error) {
    console.error('Error fetching system lock:', error);
    return NextResponse.json({ error: 'Failed to fetch system lock' }, { status: 500 });
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
    const isLocked = Boolean(body?.isLocked);
    const lockDateInput = String(body?.lockDate || '').trim();
    const lockMonth = lockDateInput ? normalizeLockMonth(lockDateInput) : null;

    if (isLocked && !lockMonth) {
      return NextResponse.json(
        { error: 'lockDate is required when locking' },
        { status: 400 },
      );
    }

    let lockRow = await getLockRow(supabase);
    const previousLockDate = String(lockRow?.lock_date || '').trim() || null;

    if (!lockRow) {
      const { data: inserted, error: insertError } = await supabase
        .from('system_locks')
        .insert({
          lock_key: LOCK_KEY,
          is_locked: isLocked,
          lock_date: lockMonth,
          locked_by: isLocked ? user.id : null,
          locked_at: isLocked ? new Date().toISOString() : null,
          unlocked_by: isLocked ? null : user.id,
          unlocked_at: isLocked ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      lockRow = inserted;
    } else {
      const { data: updated, error: updateError } = await supabase
        .from('system_locks')
        .update({
          is_locked: isLocked,
          lock_date: lockMonth,
          locked_by: isLocked ? user.id : null,
          locked_at: isLocked ? new Date().toISOString() : null,
          unlocked_by: isLocked ? null : user.id,
          unlocked_at: isLocked ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lockRow.id)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      lockRow = updated;
    }

    let bulkLockCount = 0;
    let bulkUnlockCount = 0;
    let queueResults: Array<Record<string, unknown>> = [];
    let vehicleQueueResults: Array<Record<string, unknown>> = [];

    if (isLocked && lockMonth) {
      bulkLockCount = await applySystemLockToBulkInvoices(supabase, {
        lockMonth,
        userId: user.id,
      });
    } else if (!isLocked) {
      bulkUnlockCount = await clearSystemLockFromBulkInvoices(supabase, {
        userId: user.id,
      });

      queueResults = await processQueuedJobCardInvoices(supabase, user.id);
      vehicleQueueResults = await processQueuedVehicleBilling(
        supabase,
        user.id,
        previousLockDate,
      );
    }

    const enriched = await enrichLockRow(supabase, lockRow);

    return NextResponse.json({
      lock: enriched,
      bulkLockCount,
      bulkUnlockCount,
      queuedProcessed: queueResults.length,
      queueResults,
      vehicleQueuedProcessed: vehicleQueueResults.length,
      vehicleQueueResults,
    });
  } catch (error) {
    console.error('Error updating system lock:', error);
    return NextResponse.json({ error: 'Failed to update system lock' }, { status: 500 });
  }
}
