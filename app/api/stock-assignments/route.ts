import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { inventory_item_ids, technician_email, notes } = body;

    if (!Array.isArray(inventory_item_ids) || !technician_email) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    let assignedCount = 0;

    for (const itemId of inventory_item_ids) {
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          status: 'ASSIGNED',
          assigned_to_technician: technician_email,
          assigned_date: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('status', 'IN STOCK');

      if (!updateError) assignedCount++;
    }

    return NextResponse.json({ assigned_count: assignedCount });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const technicianEmail = searchParams.get('technician_email');

    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        category:inventory_categories(description)
      `)
      .eq('status', 'ASSIGNED')
      .order('assigned_date', { ascending: false });

    if (technicianEmail) {
      query = query.eq('assigned_to_technician', technicianEmail);
    }

    const { data: items, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}