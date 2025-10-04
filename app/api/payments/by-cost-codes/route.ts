import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { costCodes } = body;

    if (!costCodes || !Array.isArray(costCodes) || costCodes.length === 0) {
      return NextResponse.json({ error: 'Cost codes array is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch payment data for the provided cost codes
    const { data: payments, error } = await supabase
      .from('payments_')
      .select('*')
      .in('cost_code', costCodes);

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json({ error: 'Failed to fetch payment data' }, { status: 500 });
    }

    console.log(`Fetched ${payments?.length || 0} payment records for ${costCodes.length} cost codes`);

    return NextResponse.json({
      success: true,
      payments: payments || [],
      count: payments?.length || 0
    });

  } catch (error) {
    console.error('Error in payments by cost codes API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


