import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const getString = (value: unknown) => String(value || '').trim();

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
    const costCode = getString(body.cost_code || body.new_account_number);
    const company = getString(body.company);
    const parts = Array.isArray(body.inventory_items) ? body.inventory_items : [];

    if (!costCode) {
      return NextResponse.json({ error: 'cost_code is required' }, { status: 400 });
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: 'No parts selected' }, { status: 400 });
    }

    const clientCode = costCode;

    for (const item of parts) {
      const categoryCode = getString(item.code || item.category_code || 'CLIENT_STOCK');
      const serialNumber = getString(item.serial_number || item.ip_address || item.stock_id || '');

      await supabase
        .from('client_inventory_categories')
        .upsert(
          {
            client_code: clientCode,
            cost_code: costCode,
            category_code: categoryCode,
            company: company || null,
          },
          { onConflict: 'client_code,cost_code,category_code' }
        );

      await supabase
        .from('client_inventory_items')
        .insert({
          client_code: clientCode,
          cost_code: costCode,
          category_code: categoryCode,
          serial_number: serialNumber,
          status: 'IN STOCK',
          notes: item.description ? `Assigned to client stock: ${item.description}` : 'Assigned to client stock',
          company: company || null,
        });

      const itemId = item.stock_id || item.inventory_item_id || item.id;
      if (itemId) {
        await supabase.from('inventory_items').delete().eq('id', itemId);
      }
    }

    return NextResponse.json({
      success: true,
      cost_code: costCode,
      parts_added: parts.length,
    });
  } catch (error) {
    console.error('Error in client-stock assign-parts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
