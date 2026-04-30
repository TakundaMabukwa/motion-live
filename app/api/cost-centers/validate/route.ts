import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const normalizeBillingMonth = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw.slice(0, 7)}-01`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

const normalizeBillingMonthsArray = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const normalized = [];
  for (const item of value) {
    const month = normalizeBillingMonth(item);
    if (!month || seen.has(month)) continue;
    seen.add(month);
    normalized.push(month);
  }
  return normalized;
};

export async function PUT(request) {
  try {
    const {
      cost_code,
      validated,
      billing_month,
      total_amount_locked,
      total_amount_locked_value,
      total_amount_locked_multiplier,
      total_amount_locked_billing_months,
    } = await request.json();

    if (!cost_code) {
      return NextResponse.json(
        { error: 'Cost code required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const updatePayload = {};

    if (typeof validated === 'boolean') {
      updatePayload.validated = validated;
    }

    const shouldLockTotal = typeof total_amount_locked === 'boolean';
    const normalizedBillingMonth = normalizeBillingMonth(billing_month);
    const parsedMultiplier = Number.parseInt(
      String(total_amount_locked_multiplier || '1').trim(),
      10,
    );
    const normalizedMultiplier =
      Number.isFinite(parsedMultiplier) && parsedMultiplier > 0
        ? Math.min(parsedMultiplier, 12)
        : 1;
    const normalizedCoveredMonths = normalizeBillingMonthsArray(
      total_amount_locked_billing_months,
    );
    const lockTimestamp = total_amount_locked
      ? normalizedBillingMonth
        ? `${normalizedBillingMonth}T00:00:00.000Z`
        : new Date().toISOString()
      : null;

    if (shouldLockTotal) {
      if (authError || !user) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            details: 'You must be signed in to lock the total amount',
          },
          { status: 401 }
        );
      }

      updatePayload.total_amount_locked = total_amount_locked;
      updatePayload.total_amount_locked_value = total_amount_locked
        ? Number(total_amount_locked_value || 0)
        : null;
      updatePayload.total_amount_locked_by = total_amount_locked ? user.id : null;
      updatePayload.total_amount_locked_at = lockTimestamp;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('cost_centers')
      .update(updatePayload)
      .eq('cost_code', cost_code)
      .select()
      .single();

    if (error) {
      console.error('Error updating cost center:', error);
      return NextResponse.json(
        { error: 'Failed to update cost center', details: error.message },
        { status: 500 }
      );
    }

    if (shouldLockTotal) {
      const vehicleLockPayload = {
        amount_locked: total_amount_locked,
        amount_locked_by: total_amount_locked ? user.id : null,
        amount_locked_at: lockTimestamp,
      };

      const duplicateUpdate = supabase
        .from('vehicles_duplicate')
        .update(vehicleLockPayload)
        .or(`new_account_number.eq.${cost_code},account_number.eq.${cost_code}`);

      const vehiclesUpdate = supabase
        .from('vehicles')
        .update(vehicleLockPayload)
        .or(`new_account_number.eq.${cost_code},account_number.eq.${cost_code}`);

      const [duplicateResult, vehiclesResult] = await Promise.all([
        duplicateUpdate,
        vehiclesUpdate,
      ]);

      if (duplicateResult.error || vehiclesResult.error) {
        console.error('Error locking vehicles for cost center total:', {
          duplicateError: duplicateResult.error,
          vehiclesError: vehiclesResult.error,
          cost_code,
        });
        return NextResponse.json(
          {
            error: 'Failed to lock vehicles for cost center',
            details:
              duplicateResult.error?.message ||
              vehiclesResult.error?.message ||
              'Vehicle lock update failed',
          },
          { status: 500 }
        );
      }
    }

    let total_amount_locked_by_email = null;

    if (data?.total_amount_locked_by) {
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', data.total_amount_locked_by)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching cost center lock owner email:', userError);
      } else {
        total_amount_locked_by_email = userRow?.email || null;
      }
    }

    return NextResponse.json({
      ...data,
      total_amount_locked_by_email,
    });
  } catch (error) {
    console.error('Error in cost center validate API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to update cost center', details: errMsg },
      { status: 500 }
    );
  }
}
