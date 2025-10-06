import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return NextResponse.json({
        error: 'Missing required parameter: accountNumber'
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch payment record for the specific account number from payments_ table
    const { data: payment, error } = await supabase
      .from('payments_')
      .select('*')
      .eq('cost_code', accountNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No payment record found
        return NextResponse.json({
          payment: null,
          message: `No payment record found for account: ${accountNumber}`
        });
      }
      console.error('Error fetching payment record:', error);
      return NextResponse.json({
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      payment: payment,
      message: 'Payment record retrieved successfully'
    });

  } catch (error) {
    console.error('Error in by-account endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
