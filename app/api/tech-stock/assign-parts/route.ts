import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const normalizeEmail = (value: string | null | undefined) =>
  String(value || '').trim().toLowerCase();

const normalizePartRecord = (part: Record<string, unknown>) => {
  const normalized = { ...part } as Record<string, unknown>;
  const serialNumber = String(
    part?.serial_number ?? part?.serial ?? part?.serialNumber ?? part?.ip_address ?? '',
  ).trim();

  normalized.description = String(
    part?.description ?? part?.name ?? part?.item_description ?? part?.code ?? 'Item',
  ).trim();
  normalized.code = String(part?.code ?? part?.category_code ?? '').trim();
  normalized.quantity = Math.max(1, Number(part?.quantity ?? part?.count ?? 1) || 1);
  normalized.stock_id = String(part?.stock_id ?? part?.inventory_item_id ?? part?.id ?? '').trim();
  normalized.serial_number = serialNumber;
  normalized.ip_address = String(part?.ip_address ?? '').trim();

  return normalized;
};

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
    const parts = Array.isArray(body.inventory_items)
      ? body.inventory_items.map((part: Record<string, unknown>) =>
          normalizePartRecord(part || {}),
        )
      : [];

    if (!technicianEmail) {
      return NextResponse.json({ error: 'technician_email is required' }, { status: 400 });
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: 'No parts selected' }, { status: 400 });
    }

    const inventoryItemIds = [
      ...new Set(
        parts
          .map((item) => Number(item.stock_id || item.inventory_item_id || item.id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ] as number[];

    if (inventoryItemIds.length !== parts.length) {
      return NextResponse.json(
        { error: 'One or more selected stock items are invalid or missing an inventory id' },
        { status: 400 },
      );
    }

    const { data: moveResult, error: moveError } = await supabase.rpc(
      'tech_stock_assign_inventory_parts',
      {
        p_technician_email: technicianEmail,
        p_inventory_item_ids: inventoryItemIds,
        p_parts: parts,
      },
    );

    if (moveError) {
      return NextResponse.json({
        error:
          moveError.message ||
          'Failed to atomically move stock from inventory to technician',
      }, { status: 500 });
    }

    const moveSummary =
      Array.isArray(moveResult) && moveResult.length > 0 ? moveResult[0] : null;

    return NextResponse.json({
      success: true,
      technician_email: technicianEmail,
      parts_added: parts.length,
      total_parts: Number(moveSummary?.total_parts || 0),
      moved_count: Number(moveSummary?.moved_count || inventoryItemIds.length),
    });
  } catch (error) {
    console.error('Error in tech-stock assign-parts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
