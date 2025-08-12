import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending' or 'approved'
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build the query - only fetch approved orders
    let query = supabase
      .from('stock_orders')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    // Apply status filter if provided
    if (status === 'pending') {
      query = query.eq('status', 'pending');
    } else if (status === 'approved') {
      query = query.eq('status', 'approved');
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: stockOrders, error } = await query;

    if (error) {
      console.error('Error fetching stock orders:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

               // Transform stock_orders to invoice format
           const invoices = stockOrders?.map(order => ({
             id: order.order_number,
             client: order.supplier || 'Unknown Supplier',
             amount: parseFloat(order.total_amount_ex_vat) || 0,
             date: new Date(order.order_date).toISOString().split('T')[0],
             approved: order.status === 'approved',
             dueDate: new Date(order.order_date).toISOString().split('T')[0], // Using order date as due date for now
             pdfUrl: order.invoice_link || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
             orderId: order.id,
             totalAmountUSD: order.total_amount_usd,
             orderItems: order.order_items || []
           })) || [];

    // Get total count for pagination - only count approved orders
    let countQuery = supabase
      .from('stock_orders')
      .select('*', { count: 'exact', head: true })
      .eq('approved', true);

    if (status === 'pending') {
      countQuery = countQuery.eq('status', 'pending');
    } else if (status === 'approved') {
      countQuery = countQuery.eq('status', 'approved');
    }

    const { count } = await countQuery;

    return NextResponse.json({
      invoices,
      count: count || 0,
      page: Math.floor(offset / limit) + 1,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('Error in invoices GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update invoice status (approve/reject)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID and status are required' }, { status: 400 });
    }

    // Update the stock order status
    const { data, error } = await supabase
      .from('stock_orders')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('Error updating stock order:', error);
      return NextResponse.json({ error: 'Failed to update invoice status' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Invoice status updated successfully',
      invoice: data?.[0]
    });

  } catch (error) {
    console.error('Error in invoices PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
