import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const costCode = searchParams.get('cost_code');

    if (!costCode) {
      return NextResponse.json(
        { error: 'Cost code required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find all vehicles with this new_account_number
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, reg, fleet_number, make, model, new_account_number')
      .eq('new_account_number', costCode);

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      vehicles: vehicles || [],
      count: vehicles?.length || 0
    });
  } catch (error) {
    console.error('Error in check-vehicles API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to check vehicles', details: errMsg },
      { status: 500 }
    );
  }
}
