import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const getStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
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
    const equipmentUsed = Array.isArray(body?.equipment_used) ? body.equipment_used : [];

    if (equipmentUsed.length === 0) {
      return NextResponse.json({
        success: true,
        removed_count: 0,
        message: 'No equipment used supplied',
      });
    }

    const idCandidates = Array.from(
      new Set(
        equipmentUsed
          .map((item: Record<string, unknown>) => item?.stock_id ?? item?.id)
          .map((value) => getStringValue(value))
          .filter(Boolean),
      ),
    );

    const serialCandidates = Array.from(
      new Set(
        equipmentUsed
          .map(
            (item: Record<string, unknown>) =>
              item?.serial_number ?? item?.serial ?? item?.item_serial,
          )
          .map((value) => getStringValue(value))
          .filter(Boolean),
      ),
    );

    const inventoryIdsToDelete = new Set<string>();

    if (idCandidates.length > 0) {
      const { data: itemsById, error: itemsByIdError } = await supabase
        .from('inventory_items')
        .select('id')
        .in('id', idCandidates);

      if (itemsByIdError) {
        return NextResponse.json({ error: itemsByIdError.message }, { status: 500 });
      }

      (itemsById || []).forEach((item) => {
        const id = getStringValue(item?.id);
        if (id) inventoryIdsToDelete.add(id);
      });
    }

    if (serialCandidates.length > 0) {
      const { data: itemsBySerial, error: itemsBySerialError } = await supabase
        .from('inventory_items')
        .select('id')
        .in('serial_number', serialCandidates);

      if (itemsBySerialError) {
        return NextResponse.json({ error: itemsBySerialError.message }, { status: 500 });
      }

      (itemsBySerial || []).forEach((item) => {
        const id = getStringValue(item?.id);
        if (id) inventoryIdsToDelete.add(id);
      });
    }

    const idsToDelete = Array.from(inventoryIdsToDelete);

    if (idsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        removed_count: 0,
        message: 'No matching Soltrack stock items found',
      });
    }

    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      removed_count: idsToDelete.length,
      message: 'Equipment used removed from Soltrack stock',
    });
  } catch (error) {
    console.error('Error in remove-used-equipment POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
