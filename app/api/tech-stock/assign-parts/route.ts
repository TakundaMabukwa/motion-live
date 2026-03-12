import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const normalizeEmail = (value: string | null | undefined) =>
  String(value || '').trim().toLowerCase();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const technicianEmail = normalizeEmail(body.technician_email);
    const parts = Array.isArray(body.inventory_items) ? body.inventory_items : [];

    if (!technicianEmail) {
      return NextResponse.json({ error: 'technician_email is required' }, { status: 400 });
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: 'No parts selected' }, { status: 400 });
    }

    const { data: techStock } = await supabase
      .from('tech_stock')
      .select('assigned_parts')
      .eq('technician_email', technicianEmail)
      .maybeSingle();

    const existingParts = Array.isArray(techStock?.assigned_parts) ? techStock?.assigned_parts : [];
    const newParts = [...existingParts, ...parts];

    const { error: upsertError } = await supabase
      .from('tech_stock')
      .upsert(
        {
          technician_email: technicianEmail,
          assigned_parts: newParts,
        },
        { onConflict: 'technician_email' }
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Remove assigned items from inventory_items (normal stock)
    for (const item of parts) {
      const itemId = item.stock_id || item.inventory_item_id || item.id;
      if (!itemId) continue;
      await supabase.from('inventory_items').delete().eq('id', itemId);
    }

    return NextResponse.json({
      success: true,
      technician_email: technicianEmail,
      parts_added: parts.length,
      total_parts: newParts.length,
    });
  } catch (error) {
    console.error('Error in tech-stock assign-parts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
