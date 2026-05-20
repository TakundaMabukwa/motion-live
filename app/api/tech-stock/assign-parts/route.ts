import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assignInventoryItemsToTechnicianStock } from '@/lib/server/inventory-to-tech-stock';

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
    const technicianEmail = String(body.technician_email || '').trim();
    const techStockId = Number(body.tech_stock_id ?? body.techStockId ?? 0) || null;

    const inventoryItemIds = [
      ...new Set(
        (Array.isArray(body.inventory_item_ids)
          ? body.inventory_item_ids
          : Array.isArray(body.inventory_items)
            ? body.inventory_items.map(
                (item: Record<string, unknown>) =>
                  Number(item?.stock_id ?? item?.inventory_item_id ?? item?.id),
              )
            : []
        ).filter((id: unknown) => Number.isFinite(Number(id)) && Number(id) > 0),
      ),
    ] as number[];

    const result = await assignInventoryItemsToTechnicianStock(supabase, {
      technicianEmail,
      inventoryItemIds,
      techStockId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      ...result.data,
    });
  } catch (error) {
    console.error('Error in tech-stock assign-parts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
