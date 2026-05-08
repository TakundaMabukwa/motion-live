import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureExternalClientSetup } from '@/lib/server/ensure-external-client';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const OPTIONAL_JOB_CARD_COLUMNS = [
  'vehicle_chassis',
  'vehicle_colour',
  'old_serial_number',
  'new_serial_number',
  'cost_center_code',
  'cost_center_name',
] as const;

function stripOptionalJobCardColumns<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload };
  for (const column of OPTIONAL_JOB_CARD_COLUMNS) {
    delete next[column];
  }
  return next;
}

function isMissingOptionalJobCardColumn(message?: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return OPTIONAL_JOB_CARD_COLUMNS.some((column) => normalized.includes(column));
}

function stripOptionalColumnsFromSelect(selectFields: string): string {
  if (!selectFields || selectFields.trim() === '*') return selectFields;
  const stripped = selectFields
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean)
    .filter((field) => !(OPTIONAL_JOB_CARD_COLUMNS as readonly string[]).includes(field));
  return stripped.length > 0 ? stripped.join(', ') : '*';
}

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

type CostCenterLookupRow = {
  cost_code?: string | null;
  cost_center_code?: string | null;
  cost_center_name?: string | null;
  site_allocated?: string | null;
  company?: string | null;
  operational?: boolean | null;
  created_at?: string | null;
};

function toTrimmedString(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeCode(value: unknown): string {
  return toTrimmedString(value).toUpperCase();
}

function normalizeName(value: unknown): string {
  return toTrimmedString(value).toLowerCase();
}

function pickCostCenterName(row: CostCenterLookupRow | null | undefined): string | null {
  const explicitName = toTrimmedString(row?.cost_center_name);
  if (explicitName) return explicitName;
  const siteName = toTrimmedString(row?.site_allocated);
  if (siteName) return siteName;
  const companyName = toTrimmedString(row?.company);
  return companyName || null;
}

async function resolveCostCenterContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    accountNumber,
    requestedCostCenterCode,
    requestedCostCenterName,
  }: {
    accountNumber?: unknown;
    requestedCostCenterCode?: unknown;
    requestedCostCenterName?: unknown;
  },
): Promise<{ costCenterCode: string | null; costCenterName: string | null }> {
  let resolvedCode = normalizeCode(requestedCostCenterCode) || null;
  let resolvedName = toTrimmedString(requestedCostCenterName) || null;
  const normalizedAccount = normalizeCode(accountNumber);

  const maybeApplyRow = (row: CostCenterLookupRow | null | undefined) => {
    if (!row) return;
    const rowCode = normalizeCode(row.cost_center_code);
    if (!resolvedCode && rowCode) {
      resolvedCode = rowCode;
    }
    if (!resolvedName) {
      resolvedName = pickCostCenterName(row);
    }
  };

  try {
    const codeLookupCandidates = [...new Set([resolvedCode, normalizedAccount].filter(Boolean))];
    for (const candidate of codeLookupCandidates) {
      const { data: byCodeRow, error: byCodeError } = await supabase
        .from('cost_centers')
        .select('cost_code, cost_center_code, cost_center_name, site_allocated, company, operational, created_at')
        .ilike('cost_center_code', candidate)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (byCodeError) {
        console.warn('Skipping cost center code lookup due to error:', byCodeError.message);
        continue;
      }

      if (byCodeRow) {
        maybeApplyRow(byCodeRow as CostCenterLookupRow);
        return { costCenterCode: resolvedCode, costCenterName: resolvedName };
      }
    }

    if (normalizedAccount) {
      const { data: byAccountRows, error: byAccountError } = await supabase
        .from('cost_centers')
        .select('cost_code, cost_center_code, cost_center_name, site_allocated, company, operational, created_at')
        .ilike('cost_code', normalizedAccount)
        .order('created_at', { ascending: true });

      if (byAccountError) {
        console.warn('Skipping account cost center lookup due to error:', byAccountError.message);
      } else if (Array.isArray(byAccountRows) && byAccountRows.length > 0) {
        const requestedNameNormalized = normalizeName(resolvedName);
        const rows = byAccountRows as CostCenterLookupRow[];
        const byNameMatch = requestedNameNormalized
          ? rows.find((row) => normalizeName(pickCostCenterName(row)) === requestedNameNormalized)
          : null;
        const operationalRows = rows.filter(
          (row) => row.operational === true && normalizeCode(row.cost_center_code),
        );

        const chosenRow =
          byNameMatch ||
          (operationalRows.length === 1 ? operationalRows[0] : null) ||
          (rows.length === 1 ? rows[0] : null);

        maybeApplyRow(chosenRow);
      }
    }
  } catch (error) {
    console.warn(
      'Failed to resolve cost center context for job card create:',
      error instanceof Error ? error.message : error,
    );
  }

  return { costCenterCode: resolvedCode, costCenterName: resolvedName };
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
    const escalationRole = searchParams.get('escalation_role');
    const excludeCompleted = String(searchParams.get('exclude_completed') || '').toLowerCase() === 'true';
    const view = searchParams.get('view') || '';
    const includeCount = String(searchParams.get('include_count') || 'true').toLowerCase() !== 'false';
    const selectFields =
      view === 'fc-list'
        ? 'id, job_number, order_number, customer_name, customer_email, customer_address, job_type, vehicle_registration, quotation_products, completion_notes, fc_note_acknowledged, role, move_to, status, job_status, created_at, updated_at, account_id, new_account_number, cost_center_code, cost_center_name, escalation_role, escalation_source_role, escalated_at, parts_required, job_description'
        : '*';

    const runListQuery = async (fields: string) => {
      let query = supabase.from('job_cards').select(fields).order('created_at', { ascending: false });

      if (accountNumber) {
        query = query.eq('new_account_number', accountNumber);
      }

      if (escalationRole) {
        query = query.eq('escalation_role', escalationRole);
      }

      if (excludeCompleted) {
        query = query
          .not('job_status', 'in', '("Completed","completed")')
          .not('status', 'in', '("Completed","completed")');
      }

      return query.range(offset, offset + limit - 1);
    };

    let { data, error } = await runListQuery(selectFields);

    if (error && isMissingOptionalJobCardColumn(error.message)) {
      const fallbackSelect = stripOptionalColumnsFromSelect(selectFields);
      ({ data, error } = await runListQuery(fallbackSelect));
    }

    if (error) {
      console.error('Error fetching job cards:', error);
      return NextResponse.json({ error: 'Failed to fetch job cards' }, { status: 500 });
    }

    let count: number | null = null;

    if (includeCount) {
      let countQuery = supabase.from('job_cards').select('id', { count: 'exact', head: true });

      if (accountNumber) {
        countQuery = countQuery.eq('new_account_number', accountNumber);
      }

      if (escalationRole) {
        countQuery = countQuery.eq('escalation_role', escalationRole);
      }

      if (excludeCompleted) {
        countQuery = countQuery
          .not('job_status', 'in', '("Completed","completed")')
          .not('status', 'in', '("Completed","completed")');
      }

      const countResult = await countQuery;
      count = countResult.count ?? 0;
    }

    return NextResponse.json({
      job_cards: data || [],
      count: includeCount ? count || 0 : null,
      page,
      limit,
      total_pages: includeCount ? Math.ceil((count || 0) / limit) : null,
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
    const isAdminCreatedJob = normalizedJobType === 'admin_created';
    const isExternalQuote = !body.repair && normalizedQuoteType === 'external';
    const requestedRole = String(body.role || '').trim();
    const requestedMoveTo = String(body.move_to || body.moveTo || '').trim();
    const resolvedRole = requestedRole || (isAdminCreatedJob ? 'admin' : null);
    const resolvedMoveTo = requestedMoveTo || (isAdminCreatedJob ? 'admin' : null);

    let resolvedNewAccountNumber = body.newAccountNumber || body.new_account_number || null;

    if (isExternalQuote) {
      const externalClientSetup = await ensureExternalClientSetup(supabase, body);
      resolvedNewAccountNumber = externalClientSetup.costCode;
    }

    const { costCenterCode, costCenterName } = await resolveCostCenterContext(supabase, {
      accountNumber: resolvedNewAccountNumber,
      requestedCostCenterCode: body.cost_center_code ?? body.costCenterCode,
      requestedCostCenterName:
        body.cost_center_name ??
        body.costCenterName ??
        body.site_allocated ??
        body.siteAllocated,
    });

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
      role: resolvedRole,
      move_to: resolvedMoveTo,

      account_id: body.accountId && body.accountId !== 'null' ? body.accountId : null,
      new_account_number: resolvedNewAccountNumber,
      cost_center_code: costCenterCode,
      cost_center_name: costCenterName,
      customer_name: body.customerName || body.customer_name || '',
      customer_email: body.customerEmail || body.customer_email || '',
      customer_phone: body.customerPhone || body.customer_phone || '',
      customer_address: body.customerAddress || body.customer_address || '',
      contact_person: body.contactPerson || body.contact_person || '',
      decommission_date: body.decommissionDate || body.decommission_date || null,
      annuity_end_date: body.annuityEndDate || body.annuity_end_date || null,
      due_date: body.dueDate || body.due_date || null,
      order_number: body.order_number || body.orderNumber || null,

      vehicle_id: body.vehicleId || body.vehicle_id || null,
      vehicle_registration: body.vehicleRegistration || body.vehicle_registration || '',
      vehicle_make: body.vehicleMake || body.vehicle_make || '',
      vehicle_model: body.vehicleModel || body.vehicle_model || '',
      vehicle_year: body.vehicleYear || body.vehicle_year || null,
      vehicle_chassis: body.vehicleChassis || body.vehicle_chassis || body.chasis || body.vinNumber || body.vin_numer || '',
      vehicle_colour: body.vehicleColour || body.vehicle_colour || body.color || body.colour || '',
      vin_numer: body.vinNumber || body.vin_numer || body.vehicleChassis || body.vehicle_chassis || body.chasis || '',
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

      old_serial_number: body.old_serial_number || body.oldSerialNumber || null,
      new_serial_number: body.new_serial_number || body.newSerialNumber || null,

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

    const insertQuery = supabase
      .from('job_cards')
      .insert([jobCardData])
      .select('id, job_number, customer_name, job_type, status, created_at')
      .single();

    let { data, error } = await insertQuery;

    if (error && isMissingOptionalJobCardColumn(error.message)) {
      const fallbackJobCardData = stripOptionalJobCardColumns(jobCardData);
      ({ data, error } = await supabase
        .from('job_cards')
        .insert([fallbackJobCardData])
        .select('id, job_number, customer_name, job_type, status, created_at')
        .single());
    }

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
