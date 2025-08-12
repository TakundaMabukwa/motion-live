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
    const search = searchParams.get('search') || '';

    // Build query for approved stock orders only
    let query = supabase
      .from('stock_orders')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,supplier.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: stockOrders, error } = await query;

    if (error) {
      console.error('Error fetching approved stock orders:', error);
      return NextResponse.json({ error: 'Failed to fetch approved stock orders' }, { status: 500 });
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
      status: order.status || 'approved',
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
      .select('*', { count: 'exact', head: true })
      .eq('approved', true);

    return NextResponse.json({
      orders,
      count: count || 0,
      page: Math.floor(offset / limit) + 1,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('Error in approved stock orders GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
