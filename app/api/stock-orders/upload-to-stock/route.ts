import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, items } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Items with serial numbers are required' }, { status: 400 });
    }

    // Get the stock order
    const { data: order, error: orderError } = await supabase
      .from('stock_orders')
      .select('*')
      .eq('id', orderId)
      .eq('status', 'paid')
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found or not paid' }, { status: 404 });
    }

    if (!order.order_items || !Array.isArray(order.order_items)) {
      return NextResponse.json({ error: 'No items found in order' }, { status: 400 });
    }

    let itemsCreated = 0;
    const errors = [];

    // Process each item with manual serial numbers
    for (const item of items) {
      try {
        const { description, serialNumber, categoryCode } = item;

        // Check if category exists, create if not
        const { data: existingCategory } = await supabase
          .from('inventory_categories')
          .select('code')
          .eq('code', categoryCode)
          .single();

        if (!existingCategory) {
          await supabase
            .from('inventory_categories')
            .insert({
              code: categoryCode,
              description: description,
              total_count: 0
            });
        }

        // Create inventory item with manual serial number
        const { error: insertError } = await supabase
          .from('inventory_items')
          .insert({
            category_code: categoryCode,
            serial_number: serialNumber,
            status: 'IN STOCK',
            date_adjusted: new Date().toISOString().split('T')[0]
          });

        if (insertError) {
          errors.push(`Failed to create item ${serialNumber}: ${insertError.message}`);
        } else {
          itemsCreated++;
        }
      } catch (error) {
        errors.push(`Error processing item ${item.description}: ${error.message}`);
      }
    }

    // Update order status to 'received'
    await supabase
      .from('stock_orders')
      .update({ status: 'received' })
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      itemsCreated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error uploading to stock:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}