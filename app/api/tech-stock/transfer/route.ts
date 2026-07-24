import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { appendAssignedPartsToTechnicianStock } from '@/lib/server/tech-stock-assignment';
import {
  buildTransferPart,
  getPartQuantity,
  isValidTechnicianEmail,
  normalizeEmail,
  parseAssignedPartRowId,
  partsMatchSelected,
  resolvePartSerial,
  resolvePartStockId,
} from '@/lib/tech-stock-part-identity';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getPartLabel = (part: Record<string, unknown>) =>
  String(
    part.description ?? part.code ?? resolvePartStockId(part) ?? 'item',
  ).trim() || 'item';

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
    const sourceTechnicianEmail = normalizeEmail(body.source_technician_email);
    const targetTechnicianEmail = normalizeEmail(body.target_technician_email);
    const targetIsSoltrack = body.target_is_soltrack === true;
    const targetTechStockId =
      Number(body.target_tech_stock_id ?? body.targetTechStockId ?? 0) || null;

    const transferItem = isPlainObject(body.item)
      ? { ...body.item }
      : ({} as Record<string, unknown>);
    const transferRowId = String(transferItem.row_id || '').trim();

    if (!sourceTechnicianEmail) {
      return NextResponse.json(
        { error: 'Source technician email is required' },
        { status: 400 },
      );
    }

    if (!isValidTechnicianEmail(sourceTechnicianEmail)) {
      return NextResponse.json(
        { error: 'Source must be a valid technician email address' },
        { status: 400 },
      );
    }

    if (!targetIsSoltrack && !targetTechnicianEmail) {
      return NextResponse.json(
        { error: 'Select a destination: technician or Soltrack Stock' },
        { status: 400 },
      );
    }

    if (
      !targetIsSoltrack &&
      !isValidTechnicianEmail(targetTechnicianEmail)
    ) {
      return NextResponse.json(
        { error: 'Target must be a valid technician email address' },
        { status: 400 },
      );
    }

    if (!targetIsSoltrack && sourceTechnicianEmail === targetTechnicianEmail) {
      return NextResponse.json(
        { error: 'Source and target technicians must be different' },
        { status: 400 },
      );
    }

    const selectedSerial = resolvePartSerial(transferItem);
    if (!selectedSerial) {
      return NextResponse.json(
        {
          error: `Serial number is required to transfer this item (${getPartLabel(transferItem)}).`,
        },
        { status: 409 },
      );
    }

    const rowLocator = parseAssignedPartRowId(transferRowId);
    if (!rowLocator) {
      return NextResponse.json(
        {
          error:
            'Selected item reference is invalid. Refresh technician stock and try again.',
        },
        { status: 409 },
      );
    }

    const { data: sourceRow, error: sourceError } = await supabase
      .from('tech_stock')
      .select('id, technician_email, assigned_parts')
      .eq('id', rowLocator.rowId)
      .ilike('technician_email', sourceTechnicianEmail)
      .maybeSingle();

    if (sourceError) {
      return NextResponse.json({ error: sourceError.message }, { status: 500 });
    }

    if (!sourceRow) {
      return NextResponse.json(
        {
          error:
            'Source technician stock row was not found. Refresh and try again.',
        },
        { status: 409 },
      );
    }

    const originalAssignedParts = Array.isArray(sourceRow.assigned_parts)
      ? [...sourceRow.assigned_parts]
      : [];

    if (rowLocator.index >= originalAssignedParts.length) {
      return NextResponse.json(
        {
          error:
            'Selected item is no longer in source stock. Refresh and try again.',
        },
        { status: 409 },
      );
    }

    const storedPart = originalAssignedParts[rowLocator.index];
    if (!isPlainObject(storedPart)) {
      return NextResponse.json(
        { error: 'Selected item data is invalid. Refresh and try again.' },
        { status: 409 },
      );
    }

    const storedRecord = { ...storedPart } as Record<string, unknown>;

    if (!resolvePartSerial(storedRecord)) {
      return NextResponse.json(
        {
          error: `Source item is missing serial_number (${getPartLabel(storedRecord)}).`,
        },
        { status: 409 },
      );
    }

    if (!partsMatchSelected(storedRecord, transferItem)) {
      return NextResponse.json(
        {
          error:
            'Selected item no longer matches technician stock (serial/stock_id). Refresh and try again.',
        },
        { status: 409 },
      );
    }

    const partQuantity = getPartQuantity(storedRecord);
    const updatedSourceParts = [...originalAssignedParts];

    if (partQuantity > 1) {
      updatedSourceParts[rowLocator.index] = {
        ...storedRecord,
        quantity: partQuantity - 1,
        available_stock: partQuantity - 1,
      };
    } else {
      updatedSourceParts.splice(rowLocator.index, 1);
    }

    const partToTransfer = buildTransferPart(storedRecord);

    // ── Soltrack Stock: insert into inventory_items ──────────────────────
    if (targetIsSoltrack) {
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const { error: sourceUpdateError } = await supabase
        .from('tech_stock')
        .update({ assigned_parts: updatedSourceParts })
        .eq('id', sourceRow.id);

      if (sourceUpdateError) {
        return NextResponse.json(
          { error: sourceUpdateError.message },
          { status: 500 },
        );
      }

      const categoryCode = String(
        partToTransfer.code || storedRecord.code || '',
      ).trim();
      const serialNumber = resolvePartSerial(partToTransfer);
      const description = String(
        partToTransfer.description || storedRecord.description || '',
      ).trim();

      if (!categoryCode || !serialNumber) {
        // Rollback source
        await supabase
          .from('tech_stock')
          .update({ assigned_parts: originalAssignedParts })
          .eq('id', sourceRow.id);

        return NextResponse.json(
          {
            error: `Cannot return to Soltrack: missing category code (${categoryCode || 'empty'}) or serial (${serialNumber || 'empty'}).`,
          },
          { status: 409 },
        );
      }

      const { error: insertError } = await serviceSupabase
        .from('inventory_items')
        .insert({
          category_code: categoryCode,
          serial_number: serialNumber,
          status: 'IN STOCK',
          direction: 'IN',
          container: 'TECH_RETURN',
          company: null,
          notes: `Returned from technician ${sourceTechnicianEmail}${description ? ` — ${description}` : ''}`,
          assigned_to_technician: null,
          assigned_date: null,
          job_card_id: null,
          date_adjusted: null,
        });

      if (insertError) {
        // Rollback source
        const { error: rollbackError } = await supabase
          .from('tech_stock')
          .update({ assigned_parts: originalAssignedParts })
          .eq('id', sourceRow.id);

        if (rollbackError) {
          console.error(
            'Failed to rollback source stock after Soltrack insert failure:',
            rollbackError,
          );
        }

        return NextResponse.json(
          {
            error: `Failed to add to Soltrack inventory: ${insertError.message}. Source stock was restored.`,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        source_technician_email: sourceTechnicianEmail,
        target: 'soltrack',
        serial_number: serialNumber,
        stock_id: partToTransfer.stock_id || null,
      });
    }

    // ── Technician-to-Technician transfer ────────────────────────────────
    if (targetTechStockId) {
      const { data: targetRow, error: targetLookupError } = await supabase
        .from('tech_stock')
        .select('id, technician_email')
        .eq('id', targetTechStockId)
        .maybeSingle();

      if (targetLookupError) {
        return NextResponse.json(
          { error: targetLookupError.message },
          { status: 500 },
        );
      }

      if (!targetRow) {
        return NextResponse.json(
          {
            error:
              'Target technician stock row was not found. Refresh and try again.',
          },
          { status: 409 },
        );
      }

      if (normalizeEmail(targetRow.technician_email) !== targetTechnicianEmail) {
        return NextResponse.json(
          {
            error:
              'Selected technician does not match the target stock row.',
          },
          { status: 409 },
        );
      }
    }

    const { error: sourceUpdateError } = await supabase
      .from('tech_stock')
      .update({ assigned_parts: updatedSourceParts })
      .eq('id', sourceRow.id);

    if (sourceUpdateError) {
      return NextResponse.json(
        { error: sourceUpdateError.message },
        { status: 500 },
      );
    }

    const appendResult = await appendAssignedPartsToTechnicianStock(
      supabase,
      targetTechnicianEmail,
      [partToTransfer],
    );

    if (!appendResult.success) {
      const { error: rollbackError } = await supabase
        .from('tech_stock')
        .update({ assigned_parts: originalAssignedParts })
        .eq('id', sourceRow.id);

      if (rollbackError) {
        console.error(
          'Failed to rollback source stock after transfer failure:',
          rollbackError,
        );
      }

      const appendMessage =
        appendResult.error instanceof Error
          ? appendResult.error.message
          : String(
              (appendResult.error as { message?: string })?.message ||
                'Failed to append item to target technician',
            );

      return NextResponse.json(
        {
          error: `${appendMessage}. Source stock was restored.`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      source_technician_email: sourceTechnicianEmail,
      target_technician_email: targetTechnicianEmail,
      serial_number: partToTransfer.serial_number,
      stock_id: partToTransfer.stock_id || null,
    });
  } catch (error) {
    console.error('Error in tech stock transfer:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
