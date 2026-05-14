import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const normalizeValue = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

const isCleanTechnicianEmail = (value: unknown) => {
  const email = normalizeValue(value);
  if (!email || !email.includes('@')) return false;
  const [localPart] = email.split('@');
  if (!localPart) return false;
  return !localPart.includes('.');
};

const toPositiveInt = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneStockObject = (value: unknown): Record<string, unknown> => {
  if (!isPlainObject(value)) return {};
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
};

const getPartQuantity = (part: Record<string, unknown>) =>
  Math.max(
    1,
    toPositiveInt(part.quantity ?? part.count ?? part.available_stock ?? 1, 1),
  );

const partsMatch = (
  candidate: Record<string, unknown>,
  target: Record<string, unknown>,
) => {
  const candidateStockId = normalizeValue(candidate.stock_id ?? candidate.id);
  const targetStockId = normalizeValue(target.stock_id ?? target.id);
  if (candidateStockId && targetStockId && candidateStockId === targetStockId) {
    return true;
  }

  const candidateSerial = normalizeValue(
    candidate.serial_number ?? candidate.serial ?? candidate.serialNumber ?? candidate.ip_address,
  );
  const targetSerial = normalizeValue(
    target.serial_number ?? target.serial ?? target.serialNumber ?? target.ip_address,
  );
  if (candidateSerial && targetSerial && candidateSerial === targetSerial) {
    return true;
  }

  const candidateCode = normalizeValue(candidate.code);
  const targetCode = normalizeValue(target.code);
  if (!candidateCode || !targetCode || candidateCode !== targetCode) {
    return false;
  }

  const candidateSupplier = normalizeValue(candidate.supplier);
  const targetSupplier = normalizeValue(target.supplier);
  if (candidateSupplier && targetSupplier && candidateSupplier !== targetSupplier) {
    return false;
  }

  const candidateDescription = normalizeValue(candidate.description);
  const targetDescription = normalizeValue(target.description);
  if (
    candidateDescription &&
    targetDescription &&
    candidateDescription !== targetDescription
  ) {
    return false;
  }

  return true;
};

type LegacyStockEntry = {
  supplier: string;
  code: string;
  entry: Record<string, unknown>;
};

const collectLegacyStockEntries = (stock: Record<string, unknown>) => {
  const entries: LegacyStockEntry[] = [];

  Object.entries(stock).forEach(([topKey, topValue]) => {
    if (!isPlainObject(topValue)) return;

    if (
      Object.prototype.hasOwnProperty.call(topValue, 'count') ||
      Object.prototype.hasOwnProperty.call(topValue, 'quantity')
    ) {
      entries.push({
        supplier: 'Technician Stock',
        code: topKey,
        entry: topValue,
      });
      return;
    }

    Object.entries(topValue).forEach(([childCode, childValue]) => {
      if (!isPlainObject(childValue)) return;
      if (
        !Object.prototype.hasOwnProperty.call(childValue, 'count') &&
        !Object.prototype.hasOwnProperty.call(childValue, 'quantity')
      ) {
        return;
      }
      entries.push({
        supplier: topKey,
        code: childCode,
        entry: childValue,
      });
    });
  });

  return entries;
};

const ensureTargetTransferPart = (
  templatePart: Record<string, unknown>,
  transferQuantity: number,
) => {
  const prepared = { ...templatePart };
  prepared.quantity = transferQuantity;
  prepared.available_stock = transferQuantity;

  const costPerUnit = toFiniteNumber(prepared.cost_per_unit);
  if (costPerUnit !== null) {
    prepared.total_cost = Number((costPerUnit * transferQuantity).toFixed(2));
    return prepared;
  }

  const existingTotalCost = toFiniteNumber(prepared.total_cost);
  const existingQuantity = getPartQuantity(prepared);
  if (existingTotalCost !== null && existingQuantity > 0) {
    const derivedCostPerUnit = existingTotalCost / existingQuantity;
    prepared.total_cost = Number(
      (derivedCostPerUnit * transferQuantity).toFixed(2),
    );
  }
  return prepared;
};

const appendPartToTechnicianStock = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  technicianEmail: string,
  part: Record<string, unknown>,
) => {
  const partsToAppend = [part];
  const { error: appendError } = await supabase.rpc(
    'tech_stock_append_assigned_parts',
    {
      p_technician_email: technicianEmail,
      p_parts: partsToAppend,
    },
  );

  if (!appendError) {
    return { success: true as const };
  }

  return { success: false as const, error: appendError };
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
    const sourceTechnicianEmail = String(
      body.source_technician_email || '',
    ).trim().toLowerCase();
    const targetTechnicianEmail = String(
      body.target_technician_email || '',
    ).trim().toLowerCase();
    const transferItem = isPlainObject(body.item)
      ? { ...body.item }
      : ({} as Record<string, unknown>);
    const transferRowId = String(transferItem.row_id || '').trim();
    const requestedQuantity = toPositiveInt(body.quantity, 0);

    if (!sourceTechnicianEmail || !targetTechnicianEmail) {
      return NextResponse.json(
        { error: 'Source and target technician emails are required' },
        { status: 400 },
      );
    }

    if (
      !isCleanTechnicianEmail(sourceTechnicianEmail) ||
      !isCleanTechnicianEmail(targetTechnicianEmail)
    ) {
      return NextResponse.json(
        { error: 'Only clean technician emails are supported for inventory transfer' },
        { status: 400 },
      );
    }

    if (sourceTechnicianEmail === targetTechnicianEmail) {
      return NextResponse.json(
        { error: 'Source and target technicians must be different' },
        { status: 400 },
      );
    }

    if (!requestedQuantity || requestedQuantity < 1) {
      return NextResponse.json(
        { error: 'Transfer quantity must be at least 1' },
        { status: 400 },
      );
    }

    const parsedSourceRowId = Number.parseInt(transferRowId.split('-')[0] || '', 10);
    const hasSourceRowId = Number.isFinite(parsedSourceRowId) && parsedSourceRowId > 0;

    let sourceRow: {
      id: number;
      technician_email: string | null;
      assigned_parts: unknown;
      stock: unknown;
    } | null = null;

    if (hasSourceRowId) {
      const exactRowQuery = await supabase
        .from('tech_stock')
        .select('id, technician_email, assigned_parts, stock')
        .eq('id', parsedSourceRowId)
        .ilike('technician_email', sourceTechnicianEmail)
        .limit(1);

      if (exactRowQuery.error) {
        return NextResponse.json(
          { error: exactRowQuery.error.message },
          { status: 500 },
        );
      }

      sourceRow = Array.isArray(exactRowQuery.data)
        ? (exactRowQuery.data[0] as typeof sourceRow)
        : null;

      if (!sourceRow) {
        return NextResponse.json(
          {
            error:
              'The selected stock row is stale or no longer available. Please refresh technician stock and try again.',
          },
          { status: 409 },
        );
      }
    } else {
      const sourceQuery = await supabase
        .from('tech_stock')
        .select('id, technician_email, assigned_parts, stock')
        .ilike('technician_email', sourceTechnicianEmail)
        .order('id', { ascending: true })
        .limit(1);

      if (sourceQuery.error) {
        return NextResponse.json(
          { error: sourceQuery.error.message },
          { status: 500 },
        );
      }
      sourceRow = Array.isArray(sourceQuery.data)
        ? (sourceQuery.data[0] as typeof sourceRow)
        : null;
    }

    if (!sourceRow) {
      return NextResponse.json(
        { error: 'Source technician stock not found' },
        { status: 404 },
      );
    }

    const originalAssignedParts = Array.isArray(sourceRow.assigned_parts)
      ? [...sourceRow.assigned_parts]
      : [];
    const originalLegacyStock = cloneStockObject(sourceRow.stock);

    const sourceAssignedParts = [...originalAssignedParts];
    const sourceLegacyStock = cloneStockObject(originalLegacyStock);

    let remainingToTransfer = requestedQuantity;
    let transferTemplatePart: Record<string, unknown> | null = null;
    const updatedSourceParts: unknown[] = [];

    sourceAssignedParts.forEach((part) => {
      const partObject = isPlainObject(part)
        ? ({ ...part } as Record<string, unknown>)
        : ({} as Record<string, unknown>);

      if (
        remainingToTransfer > 0 &&
        partsMatch(partObject, transferItem)
      ) {
        const partQuantity = getPartQuantity(partObject);
        const moved = Math.min(partQuantity, remainingToTransfer);
        const remainingPartQty = partQuantity - moved;

        if (!transferTemplatePart) {
          transferTemplatePart = ensureTargetTransferPart(partObject, moved);
        }

        remainingToTransfer -= moved;
        if (remainingPartQty > 0) {
          const reducedPart = ensureTargetTransferPart(partObject, remainingPartQty);
          updatedSourceParts.push(reducedPart);
        }
        return;
      }

      updatedSourceParts.push(partObject);
    });

    if (remainingToTransfer > 0) {
      const codeCandidates = [
        normalizeValue(transferItem.code),
        normalizeValue(transferItem.item_code),
      ].filter(Boolean);
      const preferredSupplier = normalizeValue(transferItem.supplier);

      const legacyEntries = collectLegacyStockEntries(sourceLegacyStock).sort((a, b) => {
        const aScore =
          normalizeValue(a.supplier) === preferredSupplier ? 0 : 1;
        const bScore =
          normalizeValue(b.supplier) === preferredSupplier ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return a.code.localeCompare(b.code);
      });

      for (const legacyEntry of legacyEntries) {
        if (remainingToTransfer <= 0) break;
        if (
          codeCandidates.length > 0 &&
          !codeCandidates.includes(normalizeValue(legacyEntry.code))
        ) {
          continue;
        }

        const currentCount = toPositiveInt(
          legacyEntry.entry.count ?? legacyEntry.entry.quantity,
          0,
        );
        if (currentCount <= 0) continue;

        const moved = Math.min(currentCount, remainingToTransfer);
        const newCount = currentCount - moved;
        legacyEntry.entry.count = newCount;
        if (Object.prototype.hasOwnProperty.call(legacyEntry.entry, 'quantity')) {
          legacyEntry.entry.quantity = newCount;
        }
        remainingToTransfer -= moved;

        if (!transferTemplatePart) {
          transferTemplatePart = {
            code: legacyEntry.code,
            description: String(
              legacyEntry.entry.description || transferItem.description || legacyEntry.code,
            ),
            supplier: legacyEntry.supplier,
            serial_number: String(
              transferItem.serial_number ??
                transferItem.serial ??
                transferItem.serialNumber ??
                legacyEntry.entry.serial_number ??
                legacyEntry.entry.serial ??
                legacyEntry.entry.serialNumber ??
                legacyEntry.entry.ip_address ??
                transferItem.ip_address ??
                '',
            ).trim(),
            ip_address: String(
              transferItem.ip_address ?? legacyEntry.entry.ip_address ?? '',
            ).trim(),
            cost_per_unit: transferItem.cost_per_unit ?? legacyEntry.entry.cost_per_unit ?? 0,
            total_cost: transferItem.total_cost ?? legacyEntry.entry.total_cost ?? 0,
          };
        }
      }
    }

    if (remainingToTransfer > 0) {
      return NextResponse.json(
        { error: 'Not enough stock available to transfer the requested quantity' },
        { status: 400 },
      );
    }

    const transferredQuantity = requestedQuantity;
    const templatePart = ensureTargetTransferPart(
      transferTemplatePart || transferItem,
      transferredQuantity,
    );

    const { error: sourceUpdateError } = await supabase
      .from('tech_stock')
      .update({
        assigned_parts: updatedSourceParts,
        stock: sourceLegacyStock,
      })
      .eq('id', sourceRow.id);

    if (sourceUpdateError) {
      return NextResponse.json({ error: sourceUpdateError.message }, { status: 500 });
    }

    const appendResult = await appendPartToTechnicianStock(
      supabase,
      targetTechnicianEmail,
      templatePart,
    );

    if (!appendResult.success) {
      // Compensating rollback: avoid "disappearing stock" when target append fails
      const { error: rollbackError } = await supabase
        .from('tech_stock')
        .update({
          assigned_parts: originalAssignedParts,
          stock: originalLegacyStock,
        })
        .eq('id', sourceRow.id);

      if (rollbackError) {
        console.error(
          'Failed to rollback source technician stock after append failure',
          rollbackError,
        );
      }

      return NextResponse.json(
        { error: appendResult.error?.message || 'Failed to append stock to target technician' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      source_technician_email: sourceTechnicianEmail,
      target_technician_email: targetTechnicianEmail,
      transferred_quantity: transferredQuantity,
      item_code: String(templatePart.code || transferItem.code || 'N/A'),
    });
  } catch (error) {
    console.error('Error in tech stock transfer:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
