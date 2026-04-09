import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureExternalClientSetup } from '@/lib/server/ensure-external-client';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function generateSolJobNumber(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `SOL-${n}`;
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5000');
    const offset = (page - 1) * limit;
    const accountNumber = searchParams.get('account_number');

    let query = supabase.from('job_cards').select('*').order('created_at', { ascending: false });

    if (accountNumber) {
      query = query.eq('new_account_number', accountNumber);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching job cards:', error);
      return NextResponse.json({ error: 'Failed to fetch job cards' }, { status: 500 });
    }

    let countQuery = supabase.from('job_cards').select('*', { count: 'exact', head: true });

    if (accountNumber) {
      countQuery = countQuery.eq('new_account_number', accountNumber);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      job_cards: data || [],
      count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error in job cards GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const normalizedQuoteType = String(body.quoteType || body.quote_type || '').trim().toLowerCase();
    const normalizedJobType = String(body.jobType || body.job_type || 'install').trim().toLowerCase();
    const isCalibrationJob = normalizedJobType === 'calibration';
    const isExternalQuote = !body.repair && normalizedQuoteType === 'external';

    let resolvedNewAccountNumber = body.newAccountNumber || body.new_account_number || null;

    if (isExternalQuote) {
      const externalClientSetup = await ensureExternalClientSetup(supabase, body);
      resolvedNewAccountNumber = externalClientSetup.costCode;
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    const quotationNumber = `QUOTE-${timestamp}-${randomSuffix}`;

    let jobNumber = generateSolJobNumber();
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: existing } = await supabase
        .from('job_cards')
        .select('id')
        .eq('job_number', jobNumber)
        .maybeSingle();

      if (!existing) break;
      jobNumber = generateSolJobNumber();
    }

    const effectiveRepairFlag = Boolean(body.repair || isCalibrationJob);
    const storesQuotationFields = !effectiveRepairFlag || isCalibrationJob;
    const calibrationDescription = isCalibrationJob && resolvedNewAccountNumber
      ? `Calibration job for ${body.customerName || body.customer_name || resolvedNewAccountNumber} (${resolvedNewAccountNumber})`
      : '';

    const jobCardData = {
      job_type: body.jobType || body.job_type || 'install',
      repair: effectiveRepairFlag,
      job_description: body.jobDescription || body.job_description || calibrationDescription,
      priority: body.priority || 'medium',
      status: body.status || 'draft',
      job_status: body.job_status || 'created',
      role: body.role || null,
      move_to: body.move_to || null,

      account_id: body.accountId && body.accountId !== 'null' ? body.accountId : null,
      new_account_number: resolvedNewAccountNumber,
      customer_name: body.customerName || body.customer_name || '',
      customer_email: body.customerEmail || body.customer_email || '',
      customer_phone: body.customerPhone || body.customer_phone || '',
      customer_address: body.customerAddress || body.customer_address || '',
      contact_person: body.contactPerson || body.contact_person || '',
      decommission_date: body.decommissionDate || body.decommission_date || null,
      annuity_end_date: body.annuityEndDate || body.annuity_end_date || null,
      due_date: body.dueDate || body.due_date || null,

      vehicle_id: body.vehicleId || body.vehicle_id || null,
      vehicle_registration: body.vehicleRegistration || body.vehicle_registration || '',
      vehicle_make: body.vehicleMake || body.vehicle_make || '',
      vehicle_model: body.vehicleModel || body.vehicle_model || '',
      vehicle_year: body.vehicleYear || body.vehicle_year || null,
      vin_numer: body.vinNumber || body.vin_numer || '',
      odormeter: body.odormeter || body.odormeter || '',

      job_location: body.jobLocation || body.job_location || '',
      latitude: body.latitude || null,
      longitude: body.longitude || null,

      quotation_number: isCalibrationJob
        ? 'CALIBRATION-JOB'
        : effectiveRepairFlag
          ? 'REPAIR-JOB'
          : body.quotationNumber || quotationNumber,
      quote_date: storesQuotationFields ? body.quoteDate || new Date().toISOString() : null,
      quote_expiry_date: storesQuotationFields ? body.quoteExpiryDate || null : null,
      quote_status: storesQuotationFields ? body.quoteStatus || 'draft' : null,

      purchase_type: storesQuotationFields ? body.purchaseType || 'purchase' : null,
      quotation_job_type: storesQuotationFields ? body.quotationJobType || 'install' : null,

      quotation_products: storesQuotationFields ? body.quotationProducts || [] : null,
      quotation_subtotal: storesQuotationFields ? body.quotationSubtotal || 0 : null,
      quotation_vat_amount: storesQuotationFields ? body.quotationVatAmount || 0 : null,
      quotation_total_amount: storesQuotationFields ? body.quotationTotalAmount || 0 : null,

      quote_email_subject: storesQuotationFields ? body.quoteEmailSubject || '' : null,
      quote_email_body: storesQuotationFields ? body.quoteEmailBody || '' : null,
      quote_email_footer: storesQuotationFields ? body.quoteEmailFooter || '' : null,
      quote_notes: storesQuotationFields ? body.quoteNotes || '' : null,
      quote_type: storesQuotationFields ? body.quoteType || 'external' : null,

      special_instructions: body.specialInstructions || body.special_instructions || '',

      assigned_technician_id: body.assigned_technician_id || null,
      technician_name: body.technician_name || null,
      technician_phone: body.technician_phone || null,

      job_date: body.job_date || new Date().toISOString(),
      start_time: body.start_time || null,
      completion_date: body.completion_date || null,
      end_time: body.end_time || null,

      before_photos: body.before_photos || null,
      after_photos: body.after_photos || null,

      created_by: body.created_by || '00000000-0000-0000-0000-000000000000',
      updated_by: body.updated_by || '00000000-0000-0000-0000-000000000000',
      job_number: effectiveRepairFlag ? body.job_number || jobNumber : jobNumber,
    };

    const { data, error } = await supabase
      .from('job_cards')
      .insert([jobCardData])
      .select('id, job_number, customer_name, job_type, status, created_at')
      .single();

    if (error) {
      console.error('Error inserting job card:', error);
      return NextResponse.json(
        {
          error: 'Failed to create job card',
          details: error.message,
        },
        { status: 500 },
      );
    }

    let calibrationVehicleCount = 0;

    if (isCalibrationJob && resolvedNewAccountNumber) {
      const adminSupabase = createAdminClient() || supabase;

      const [vehiclesResult, duplicateVehiclesResult] = await Promise.all([
        adminSupabase
          .from('vehicles')
          .update({ calibration: true })
          .eq('new_account_number', resolvedNewAccountNumber)
          .select('id', { count: 'exact' }),
        adminSupabase
          .from('vehicles_duplicate')
          .update({ calibration: true })
          .eq('new_account_number', resolvedNewAccountNumber)
          .select('id', { count: 'exact' }),
      ]);

      const calibrationError = vehiclesResult.error || duplicateVehiclesResult.error;

      if (calibrationError) {
        await supabase.from('job_cards').delete().eq('id', data.id);
        console.error('Error updating calibration flags:', calibrationError);
        return NextResponse.json(
          {
            error: 'Failed to update calibration vehicles',
            details: calibrationError.message,
          },
          { status: 500 },
        );
      }

      calibrationVehicleCount = Number(vehiclesResult.count || 0);
    }

    return NextResponse.json({
      success: true,
      message: 'Job card created successfully',
      data,
      calibrationVehicleCount,
    });
  } catch (error) {
    console.error('Error in job cards POST:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
