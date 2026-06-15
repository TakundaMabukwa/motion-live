import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import { NextRequest } from 'next/server';

function applyBillingOverrides(
  vehicles: Record<string, any>[],
  billingMonth: string,
): Record<string, any>[] {
  return vehicles.map((vehicle) => {
    const overrides: Record<string, any> = vehicle.billing_overrides || {};
    const monthOverrides = overrides[billingMonth];
    if (!monthOverrides || typeof monthOverrides !== 'object') return vehicle;
    return { ...vehicle, ...monthOverrides };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const costCode = searchParams.get('cost_code');
    const billingMonth = searchParams.get('billingMonth') || '';

    if (!costCode || costCode.trim() === '') {
      return NextResponse.json(
        { error: 'Cost code required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    console.log('Fetching vehicles for new_account_number:', costCode);

    let query = supabase
      .from('vehicles_duplicate')
      .select('*')
      .order('reg', { ascending: true });

    if (costCode.includes(',')) {
      const codes = costCode.split(',').map(c => c.trim()).filter(Boolean);
      query = query.in('new_account_number', codes);
    } else {
      query = query.eq('new_account_number', costCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', details: error.message },
        { status: 500 }
      );
    }

    const vehicles = data || [];
    const result = billingMonth ? applyBillingOverrides(vehicles, billingMonth) : vehicles;

    console.log('Vehicles found:', vehicles.length);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in vehicles GET API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles', details: errMsg },
      { status: 500 }
    );
  }
}
