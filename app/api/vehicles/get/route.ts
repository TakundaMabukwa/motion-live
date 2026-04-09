import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import { NextRequest } from 'next/server';

const normalizeBillingMonth = (value: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw;
};

const getBillingCutoff = (billingMonth: string) => {
  if (!billingMonth.startsWith('2026-03')) {
    return null;
  }

  return '2026-03-30T23:59:59.999Z';
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const costCode = searchParams.get('cost_code');
    const billingMonth = normalizeBillingMonth(searchParams.get('billingMonth'));

    if (!costCode) {
      return NextResponse.json(
        { error: 'Cost code required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    console.log('Fetching vehicles for new_account_number:', costCode);

    // Fetch vehicles where new_account_number matches
    let query = supabase
      .from('vehicles_duplicate')
      .select('*')
      .eq('new_account_number', costCode)
      .order('reg', { ascending: true });

    const billingCutoff = getBillingCutoff(billingMonth);
    if (billingCutoff) {
      query = query.lte('created_at', billingCutoff);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', details: error.message },
        { status: 500 }
      );
    }

    console.log('Vehicles found:', data?.length || 0);
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in vehicles GET API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles', details: errMsg },
      { status: 500 }
    );
  }
}
