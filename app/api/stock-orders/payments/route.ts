import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');

    const supabase = await createClient();

    if (orderNumber) {
      // Fetch payment for specific order
      const { data: payment, error } = await supabase
        .from('stock_payments')
        .select('*')
        .eq('order_number', orderNumber)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching payment:', error);
        return NextResponse.json(
          { error: 'Failed to fetch payment information' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        payment: payment || null
      });
    } else {
      // Fetch all payments
      const { data: payments, error } = await supabase
        .from('stock_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        return NextResponse.json(
          { error: 'Failed to fetch payments' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        payments: payments || []
      });
    }
  } catch (error) {
    console.error('Error in payments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
