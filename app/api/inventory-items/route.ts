import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryCode = searchParams.get('category_code');
    const status = searchParams.get('status');
    const technicianEmail = searchParams.get('technician_email');

    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        category:inventory_categories(description)
      `)
      .order('created_at', { ascending: false });

    if (categoryCode) query = query.eq('category_code', categoryCode);
    if (status) query = query.eq('status', status);
    if (technicianEmail) query = query.eq('assigned_to_technician', technicianEmail);

    const { data: items, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category_code, serial_number, container, status = 'IN STOCK', notes } = body;

    const { data, error } = await supabase
      .from('inventory_items')
      .insert([{ category_code, serial_number, container, status, notes }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }



    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}