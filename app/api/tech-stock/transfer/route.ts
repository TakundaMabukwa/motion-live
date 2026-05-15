import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const normalizeValue = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

const isValidSingleTechnicianEmail = (value: unknown) => {
  const email = normalizeValue(value);
  if (!email) return false;
  if (email.includes(',') || email.includes(' ')) return false;
  if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)) return false;
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

const resolvePartSerialToken = (value: Record<string, unknown>) =>
  normalizeValue(
    value.serial_number ?? value.serial ?? value.serialNumber ?? value.ip_address,
  );

type TransferRowLocator = {
  rowId: number;
  bucket: "assigned" | "legacy-array" | "legacy-object";
  index: number;
};

const parseTransferRowLocator = (value: string): TransferRowLocator | null => {
  const normalized = String(value || "").trim().toLowerCase();
  const match = normalized.match(
    /^(\d+)-(assigned|legacy-array|legacy-object)-(\d+)$/,
  );
  if (!match) return null;

  const rowId = Number.parseInt(match[1] || "", 10);
  const index = Number.parseInt(match[3] || "", 10);
  if (!Number.isFinite(rowId) || rowId <= 0) return null;
  if (!Number.isFinite(index) || index < 0) return null;

  return {
    rowId,
    bucket: match[2] as TransferRowLocator["bucket"],
    index,
  };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneStockObject = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return {};
  return JSON.parse(JSON.stringify(value));
};

const getPartQuantity = (part: Record<string, unknown>) =>
  Math.max(
    0,
    toPositiveInt(part.quantity ?? part.count ?? part.available_stock ?? 0, 0),
  );

const partsMatch = (
  candidate: Record<string, unknown>,
  target: Record<string, unknown>,
) => {
  const candidateStockId = normalizeValue(candidate.stock_id ?? candidate.id);
  const targetStockId = normalizeValue(target.stock_id ?? target.id);
  if (candidateStockId || targetStockId) {
    return Boolean(
      candidateStockId &&
        targetStockId &&
        candidateStockId === targetStockId,
    );
  }

  const candidateSerial = resolvePartSerialToken(candidate);
  const targetSerial = resolvePartSerialToken(target);
  if (candidateSerial || targetSerial) {
    return Boolean(
      candidateSerial && targetSerial && candidateSerial === targetSerial,
    );
  }

  // Never fall back to code-level matching here: that can reduce the wrong unit.
  return false;
};

const getPartIdentityLabel = (part: Record<string, unknown>) =>
  String(
    part?.code ??
      part?.description ??
      part?.stock_id ??
      part?.id ??
      'item',
  ).trim() || 'item';

type LegacyStockEntry = {
  bucket: "legacy-array" | "legacy-object";
  index: number;
  supplier: string;
  code: string;
  entry: Record<string, unknown>;
  candidate: Record<string, unknown>;
};

const collectLegacyStockEntries = (stock: unknown) => {
  const entries: LegacyStockEntry[] = [];

  if (Array.isArray(stock)) {
    stock.forEach((item, index) => {
      if (!isPlainObject(item)) return;
      const candidate: Record<string, unknown> = {
        ...item,
        code: String(item.code ?? item.category_code ?? ""),
        supplier: String(item.supplier ?? "Technician Stock"),
      };
      entries.push({
        bucket: "legacy-array",
        index,
        supplier: String(candidate.supplier || "Technician Stock"),
        code: String(candidate.code || ""),
        entry: item,
        candidate,
      });
    });
    return entries;
  }

  if (!isPlainObject(stock)) {
    return entries;
  }

  let objectIndex = 0;
  Object.entries(stock).forEach(([topKey, topValue]) => {
    if (!isPlainObject(topValue)) return;

    if (
      Object.prototype.hasOwnProperty.call(topValue, 'count') ||
      Object.prototype.hasOwnProperty.call(topValue, 'quantity')
    ) {
      const currentCount = toPositiveInt(
        topValue.count ?? topValue.quantity,
        0,
      );
      if (currentCount <= 0) return;
      const candidate: Record<string, unknown> = {
        ...topValue,
        code: topKey,
        supplier: 'Technician Stock',
      };
      entries.push({
        bucket: "legacy-object",
        index: objectIndex++,
        supplier: 'Technician Stock',
        code: topKey,
        entry: topValue,
        candidate,
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
      const currentCount = toPositiveInt(
        childValue.count ?? childValue.quantity,
        0,
      );
      if (currentCount <= 0) return;
      const candidate: Record<string, unknown> = {
        ...childValue,
        code: childCode,
        supplier: topKey,
      };
      entries.push({
        bucket: "legacy-object",
        index: objectIndex++,
        supplier: topKey,
        code: childCode,
        entry: childValue,
        candidate,
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
  // prepared.count = transferQuantity;

  

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
      !isValidSingleTechnicianEmail(sourceTechnicianEmail) ||
      !isValidSingleTechnicianEmail(targetTechnicianEmail)
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

    const transferSerialToken = resolvePartSerialToken(transferItem);
    if (!transferSerialToken) {
      return NextResponse.json(
        {
          error: `No serial number found for selected technician stock item (${getPartIdentityLabel(transferItem)}).`,
        },
        { status: 409 },
      );
    }

    const transferRowLocator = parseTransferRowLocator(transferRowId);
    if (!transferRowLocator) {
      return NextResponse.json(
        {
          error:
            'The selected stock row is stale or missing row identity. Please refresh technician stock and try again.',
        },
        { status: 409 },
      );
    }

    const sourceQuery = await supabase
      .from('tech_stock')
      .select('id, technician_email, assigned_parts, stock')
      .eq('id', transferRowLocator.rowId)
      .ilike('technician_email', sourceTechnicianEmail)
      .limit(1);

    if (sourceQuery.error) {
      return NextResponse.json(
        { error: sourceQuery.error.message },
        { status: 500 },
      );
    }

    const sourceRow = Array.isArray(sourceQuery.data)
      ? (sourceQuery.data[0] as {
          id: number;
          technician_email: string | null;
          assigned_parts: unknown;
          stock: unknown;
        } | null)
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

    const originalAssignedParts = Array.isArray(sourceRow.assigned_parts)
      ? [...sourceRow.assigned_parts]
      : [];
    const originalLegacyStock = cloneStockObject(sourceRow.stock);

    const sourceAssignedParts = [...originalAssignedParts];
    const sourceLegacyStock = cloneStockObject(originalLegacyStock);

    let remainingToTransfer = requestedQuantity;
    let transferTemplatePart: Record<string, unknown> | null = null;
    const updatedSourceParts: unknown[] = [];
    const requiresIdentityCheck = Boolean(
      normalizeValue(transferItem.stock_id ?? transferItem.id) ||
        resolvePartSerialToken(transferItem),
    );

    if (transferRowLocator.bucket === 'assigned') {
      let matchedAssignedLocator = false;
      let identityChanged = false;

      for (let index = 0; index < sourceAssignedParts.length; index += 1) {
        const part = sourceAssignedParts[index];
        const partObject = isPlainObject(part)
          ? ({ ...part } as Record<string, unknown>)
          : ({} as Record<string, unknown>);

        if (remainingToTransfer > 0 && index === transferRowLocator.index) {
          matchedAssignedLocator = true;
          if (!resolvePartSerialToken(partObject)) {
            return NextResponse.json(
              {
                error: `No serial number found in technician stock for selected item (${getPartIdentityLabel(partObject)}).`,
              },
              { status: 409 },
            );
          }

          if (requiresIdentityCheck && !partsMatch(partObject, transferItem)) {
            identityChanged = true;
            updatedSourceParts.push(partObject);
            continue;
          }

          const partQuantity = getPartQuantity(partObject);
          const moved = Math.min(partQuantity, remainingToTransfer);
          const remainingPartQty = partQuantity - moved;

          if (!transferTemplatePart && moved > 0) {
            transferTemplatePart = ensureTargetTransferPart(partObject, moved);
          }

          remainingToTransfer -= moved;
          if (remainingPartQty > 0) {
            const reducedPart = ensureTargetTransferPart(partObject, remainingPartQty);
            updatedSourceParts.push(reducedPart);
          }
          continue;
        }

        updatedSourceParts.push(partObject);
      }

      if (!matchedAssignedLocator) {
        return NextResponse.json(
          {
            error:
              'The selected technician stock item is stale. Please refresh and try again.',
          },
          { status: 409 },
        );
      }
      if (identityChanged) {
        return NextResponse.json(
          {
            error:
              'The selected technician stock item changed. Please refresh and try again.',
          },
          { status: 409 },
        );
      }
    } else {
      sourceAssignedParts.forEach((part) => {
        const partObject = isPlainObject(part)
          ? ({ ...part } as Record<string, unknown>)
          : ({} as Record<string, unknown>);
        updatedSourceParts.push(partObject);
      });
    }

    if (remainingToTransfer > 0 && transferRowLocator.bucket !== 'assigned') {
      const legacyEntries = collectLegacyStockEntries(sourceLegacyStock);
      const locatedLegacyEntry = legacyEntries.find(
        (entry) =>
          entry.bucket === transferRowLocator.bucket &&
          entry.index === transferRowLocator.index,
      );

      if (!locatedLegacyEntry) {
        return NextResponse.json(
          {
            error:
              'The selected technician stock item is stale. Please refresh and try again.',
          },
          { status: 409 },
        );
      }

      if (!resolvePartSerialToken(locatedLegacyEntry.candidate)) {
        return NextResponse.json(
          {
            error: `No serial number found in technician stock for selected item (${getPartIdentityLabel(locatedLegacyEntry.candidate)}).`,
          },
          { status: 409 },
        );
      }

      if (
        requiresIdentityCheck &&
        !partsMatch(locatedLegacyEntry.candidate, transferItem)
      ) {
        return NextResponse.json(
          {
            error:
              'The selected technician stock item changed. Please refresh and try again.',
          },
          { status: 409 },
        );
      }

      const currentCount = toPositiveInt(
        locatedLegacyEntry.entry.count ?? locatedLegacyEntry.entry.quantity,
        0,
      );
      if (currentCount > 0) {
        const moved = Math.min(currentCount, remainingToTransfer);
        const newCount = currentCount - moved;
        locatedLegacyEntry.entry.count = newCount;
        if (Object.prototype.hasOwnProperty.call(locatedLegacyEntry.entry, 'quantity')) {
          locatedLegacyEntry.entry.quantity = newCount;
        }
        remainingToTransfer -= moved;

        if (!transferTemplatePart && moved > 0) {
          transferTemplatePart = {
            code: locatedLegacyEntry.code,
            description: String(
              locatedLegacyEntry.entry.description ||
                transferItem.description ||
                locatedLegacyEntry.code,
            ),
            supplier: locatedLegacyEntry.supplier,
            serial_number: String(
              transferItem.serial_number ??
                transferItem.serial ??
                transferItem.serialNumber ??
                locatedLegacyEntry.entry.serial_number ??
                locatedLegacyEntry.entry.serial ??
                locatedLegacyEntry.entry.serialNumber ??
                locatedLegacyEntry.entry.ip_address ??
                transferItem.ip_address ??
                '',
            ).trim(),
            ip_address: String(
              transferItem.ip_address ?? locatedLegacyEntry.entry.ip_address ?? '',
            ).trim(),
            cost_per_unit:
              transferItem.cost_per_unit ??
              locatedLegacyEntry.entry.cost_per_unit ??
              0,
            total_cost:
              transferItem.total_cost ?? locatedLegacyEntry.entry.total_cost ?? 0,
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
