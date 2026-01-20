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

    // Get category_code from query params
    const { searchParams } = new URL(request.url);
    const categoryCode = searchParams.get('category_code');

    if (!categoryCode) {
      return NextResponse.json({ error: 'Category code is required' }, { status: 400 });
    }

    // Fetch an available serial number for this category that is IN STOCK and not assigned
    const { data: inventoryItem, error } = await supabase
      .from('inventory_items')
      .select('id, serial_number, category_code, status')
      .eq('category_code', categoryCode)
      .eq('status', 'IN STOCK')
      .is('assigned_to_technician', null)
      .is('job_card_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching serial number:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!inventoryItem) {
      return NextResponse.json({ 
        error: 'No available serial numbers for this category',
        serial_number: null,
        category_code: categoryCode
      }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true,
      serial_number: inventoryItem.serial_number,
      inventory_item_id: inventoryItem.id,
      category_code: inventoryItem.category_code,
      status: inventoryItem.status
    });

  } catch (error) {
    console.error('Error in get-serial:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
