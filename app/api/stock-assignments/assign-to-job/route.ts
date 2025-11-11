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
    const { job_card_id, inventory_item_ids, technician_email } = body;

    if (!job_card_id || !Array.isArray(inventory_item_ids) || !technician_email) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    let assignedCount = 0;

    for (const itemId of inventory_item_ids) {
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          status: 'ASSIGNED',
          assigned_to_technician: technician_email,
          assigned_date: new Date().toISOString(),
          job_card_id: job_card_id
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