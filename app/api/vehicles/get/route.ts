gitimport { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
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
    console.log('Fetching vehicles for new_account_number:', costCode);

    // Fetch vehicles where new_account_number matches
    const { data, error } = await supabase
      .from('vehicles_duplicate')
      .select('*')
      .eq('new_account_number', costCode)
      .order('reg', { ascending: true });

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
