import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Fetch all approved stock orders
    const { data: orders, error } = await supabase
      .from('stock_orders')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching approved stock orders:', error);
      return NextResponse.json({ error: 'Failed to fetch approved stock orders' }, { status: 500 });
    }

    // Process the orders to ensure proper data formatting
    const processedOrders = orders?.map(order => ({
      id: order.id,
      order_number: order.order_number,
      order_date: order.order_date,
      supplier: order.supplier,
      total_amount_ex_vat: order.total_amount_ex_vat,
      total_amount_usd: order.total_amount_usd,
      status: order.status,
      notes: order.notes,
      created_by: order.created_by,
      created_at: order.created_at,
      updated_at: order.updated_at,
      order_items: order.order_items,
      invoice_link: order.invoice_link,
      approved: order.approved
    })) || [];

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      orders: processedOrders,
      total: processedOrders.length
    });

  } catch (error) {
    console.error('Error in approved stock orders API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
