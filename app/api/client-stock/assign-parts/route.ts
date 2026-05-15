import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const getString = (value: unknown) => String(value || '').trim();

const normalizePartRecord = (item: Record<string, unknown>) => ({
  categoryCode: getString(item.code || item.category_code || 'CLIENT_STOCK'),
  serialNumber: getString(
    item.serial_number || item.serial || item.serialNumber || item.ip_address || '',
  ),
  inventoryItemId: Number(item.stock_id || item.inventory_item_id || item.id || 0),
  description: getString(item.description),
});

const getPartIdentityLabel = (item: Record<string, unknown>) =>
  getString(item.code || item.category_code || item.description || item.stock_id || item.id || 'item') ||
  'item';

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

    const normalizedParts = parts.map((item: Record<string, unknown>) =>
      normalizePartRecord(item || {}),
    );

    const missingSerial = normalizedParts.find((part) => !part.serialNumber);
    if (missingSerial) {
      const rawPart = parts.find((item: Record<string, unknown>) => {
        const candidate = normalizePartRecord(item || {});
        return candidate.categoryCode === missingSerial.categoryCode &&
          candidate.inventoryItemId === missingSerial.inventoryItemId;
      }) as Record<string, unknown> | undefined;
      return NextResponse.json(
        {
          error: `No serial number found for selected stock item (${getPartIdentityLabel(rawPart || {})}). Assign serial number first.`,
        },
        { status: 409 },
      );
    }

    const invalidInventoryId = normalizedParts.find(
      (part) => !Number.isFinite(part.inventoryItemId) || part.inventoryItemId <= 0,
    );
    if (invalidInventoryId) {
      return NextResponse.json(
        { error: 'One or more selected stock items are invalid or missing an inventory id' },
        { status: 400 },
      );
    }

    const clientCode = costCode;
    const uniqueCategoryCodes = Array.from(
      new Set(normalizedParts.map((part) => part.categoryCode).filter(Boolean)),
    );

    for (const categoryCode of uniqueCategoryCodes) {
      const { error: categoryUpsertError } = await supabase
        .from('client_inventory_categories')
        .upsert(
          {
            client_code: clientCode,
            cost_code: costCode,
            category_code: categoryCode,
            company: company || null,
          },
          { onConflict: 'client_code,cost_code,category_code' },
        );

      if (categoryUpsertError) {
        return NextResponse.json(
          { error: `Failed to ensure client category ${categoryCode}: ${categoryUpsertError.message}` },
          { status: 500 },
        );
      }
    }

    for (const part of normalizedParts) {
      const { error: clientInsertError } = await supabase
        .from('client_inventory_items')
        .insert({
          client_code: clientCode,
          cost_code: costCode,
          category_code: part.categoryCode,
          serial_number: part.serialNumber,
          status: 'IN STOCK',
          notes: part.description
            ? `Assigned to client stock: ${part.description}`
            : 'Assigned to client stock',
          company: company || null,
        });

      if (clientInsertError) {
        return NextResponse.json(
          { error: `Failed to insert client stock item (${part.categoryCode}/${part.serialNumber}): ${clientInsertError.message}` },
          { status: 500 },
        );
      }
    }

    const inventoryItemIds = normalizedParts.map((part) => part.inventoryItemId);
    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .in('id', inventoryItemIds);

    if (deleteError) {
      return NextResponse.json(
        {
          error:
            `Assigned to client stock, but failed to remove source inventory items: ${deleteError.message}`,
        },
        { status: 500 },
      );
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
