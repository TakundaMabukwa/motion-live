import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const costCode = searchParams.get('cost_code')?.trim();

    if (!costCode) {
      return NextResponse.json({ error: 'cost_code is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('client_inventory_items')
      .select(`
        id,
        created_at,
        category_code,
        serial_number,
        status,
        assigned_to_technician,
        notes,
        inventory_categories!client_inventory_items_category_fkey (
          description
        )
      `)
      .ilike('cost_code', costCode)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (error) {
    console.error('Error in client stock items GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
