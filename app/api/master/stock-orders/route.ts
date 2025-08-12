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
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch ALL stock orders (both approved and unapproved) for master role
    const { data: stockOrders, error } = await supabase
      .from('stock_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching stock orders:', error);
      return NextResponse.json({ error: 'Failed to fetch stock orders' }, { status: 500 });
    }

    // Transform stock_orders to the format expected by the frontend
    const orders = stockOrders?.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      supplier: order.supplier || 'Unknown Supplier',
      totalAmount: parseFloat(order.total_amount_ex_vat) || 0,
      totalAmountUSD: order.total_amount_usd,
      orderDate: new Date(order.order_date || order.created_at).toISOString().split('T')[0],
      approved: order.approved || false,
      status: order.status || 'pending',
      notes: order.notes || '',
      createdBy: order.created_by || 'Unknown',
      invoiceLink: order.invoice_link,
      orderItems: order.order_items || [],
      createdAt: order.created_at,
      updatedAt: order.updated_at
    })) || [];

    // Get total count for pagination
    const { count } = await supabase
      .from('stock_orders')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      orders,
      count: count || 0,
      page: Math.floor(offset / limit) + 1,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('Error in master stock orders GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update stock order approval status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, approved } = body;

    if (orderId === undefined || approved === undefined) {
      return NextResponse.json({ error: 'Order ID and approved status are required' }, { status: 400 });
    }

    // Update the stock order approval status
    const { data, error } = await supabase
      .from('stock_orders')
      .update({ 
        approved: approved,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select();

    if (error) {
      console.error('Error updating stock order approval:', error);
      return NextResponse.json({ error: 'Failed to update order approval status' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Order ${approved ? 'approved' : 'unapproved'} successfully`,
      order: data?.[0]
    });

  } catch (error) {
    console.error('Error in master stock orders PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Move approved stock order to purchases
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, action } = body;

    if (action === 'moveToPurchases') {
      // Get the stock order details
      const { data: stockOrder, error: fetchError } = await supabase
        .from('stock_orders')
        .select('*')
        .eq('id', orderId)
        .eq('approved', true)
        .single();

      if (fetchError || !stockOrder) {
        return NextResponse.json({ error: 'Approved stock order not found' }, { status: 404 });
      }

      // Insert into purchases table (we'll create this table)
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          stock_order_id: stockOrder.id,
          order_number: stockOrder.order_number,
          supplier: stockOrder.supplier,
          total_amount_ex_vat: stockOrder.total_amount_ex_vat,
          total_amount_usd: stockOrder.total_amount_usd,
          order_date: stockOrder.order_date,
          notes: stockOrder.notes,
          created_by: stockOrder.created_by,
          invoice_link: stockOrder.invoice_link,
          order_items: stockOrder.order_items,
          status: 'paid',
          paid_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (purchaseError) {
        console.error('Error creating purchase:', purchaseError);
        return NextResponse.json({ error: 'Failed to create purchase record' }, { status: 500 });
      }

      // Update stock order status to 'moved_to_purchases'
      const { error: updateError } = await supabase
        .from('stock_orders')
        .update({ 
          status: 'moved_to_purchases',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating stock order status:', updateError);
        // Don't fail the whole operation if this update fails
      }

      return NextResponse.json({ 
        message: 'Order successfully moved to purchases',
        purchase,
        stockOrderId: orderId
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in stock orders POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
