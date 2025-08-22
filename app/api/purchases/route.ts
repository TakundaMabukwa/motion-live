import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Fetching purchases...');
    const supabase = await createClient();
    
    // Get all payments from stock_payments
    const { data: payments, error: paymentsError } = await supabase
      .from('stock_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    console.log(`Found ${payments?.length || 0} payments`);

    // Get all order numbers from payments
    const orderNumbers = payments?.map(p => p.order_number) || [];
    
    if (orderNumbers.length === 0) {
      return NextResponse.json({
        purchases: []
      });
    }

    // Fetch corresponding orders from stock_orders
    const { data: orders, error: ordersError } = await supabase
      .from('stock_orders')
      .select('*')
      .in('order_number', orderNumbers);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    console.log(`Found ${orders?.length || 0} corresponding orders`);

    // Combine payments with orders
    const purchases = payments?.map(payment => {
      const order = orders?.find(o => o.order_number === payment.order_number);
      return {
        ...payment,
        order: order || null
      };
    }) || [];

    console.log(`Returning ${purchases.length} purchases`);

    return NextResponse.json({
      purchases: purchases
    });

  } catch (error) {
    console.error('Error in purchases API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
