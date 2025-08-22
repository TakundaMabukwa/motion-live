import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing database connection...');
    const supabase = await createClient();
    
    // Test stock_orders table
    console.log('Testing stock_orders table...');
    const { data: orders, error: ordersError } = await supabase
      .from('stock_orders')
      .select('order_number, status')
      .limit(1);
    
    console.log('Stock orders test result:', { orders, ordersError });
    
    // Test stock_payments table
    console.log('Testing stock_payments table...');
    const { data: payments, error: paymentsError } = await supabase
      .from('stock_payments')
      .select('*')
      .limit(1);
    
    console.log('Stock payments test result:', { payments, paymentsError });
    
    // Test the purchases API endpoint
    console.log('Testing purchases API...');
    const { data: purchases, error: purchasesError } = await supabase
      .from('stock_payments')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('Purchases test result:', { purchases, purchasesError });
    
    return NextResponse.json({
      success: true,
      stock_orders: { data: orders, error: ordersError },
      stock_payments: { data: payments, error: paymentsError },
      purchases_count: purchases?.length || 0
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { error: 'Database test failed', details: error.message },
      { status: 500 }
    );
  }
}
