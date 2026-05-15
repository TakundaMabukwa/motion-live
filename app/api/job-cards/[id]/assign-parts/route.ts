import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appendAssignedPartsToTechnicianStock } from '@/lib/server/tech-stock-assignment';
import type { SupabaseClient } from '@supabase/supabase-js';

const cloneStockValue = (value: unknown): unknown => {
  if (!value || typeof value !== "object") {
    return {};
  }
  return JSON.parse(JSON.stringify(value));
};

const toSafePositiveQuantity = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
};

const toSafeNonNegativeQuantity = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

const normalizeEmail = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

const extractFirstEmail = (value: unknown) => {
  const token = String(value || '')
    .split(',')
    .map((part) => part.trim())
    .find(Boolean);
  return normalizeEmail(token || '');
};

const isEmailLike = (value: string) =>
  Boolean(value) && value.includes('@') && !value.includes(' ');

const normalizePartRecord = (part: Record<string, unknown>) => {
  const normalized = { ...part } as Record<string, unknown>;

  const serialNumber = String(
    part?.serial_number ?? part?.serial ?? part?.serialNumber ?? part?.ip_address ?? '',
  ).trim();

  normalized.description = String(
    part?.description ?? part?.name ?? part?.item_description ?? part?.code ?? 'Item',
  ).trim();
  normalized.code = String(part?.code ?? part?.category_code ?? '').trim();
  normalized.quantity = toSafePositiveQuantity(part?.quantity ?? part?.count ?? 1);
  normalized.stock_id = String(part?.stock_id ?? part?.inventory_item_id ?? part?.id ?? '').trim();
  normalized.row_id = String(part?.row_id ?? '').trim();
  normalized.serial_number = serialNumber;
  normalized.ip_address = String(part?.ip_address ?? '').trim();

  return normalized;
};

const normalizeToken = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

const resolvePartSerialToken = (value: Record<string, unknown>) =>
  normalizeToken(
    value.serial_number ?? value.serial ?? value.serialNumber ?? value.ip_address,
  );

type SourceRowLocator = {
  rowId: number;
  bucket: 'assigned' | 'legacy-array' | 'legacy-object';
  index: number;
};

const parseSourceRowLocator = (value: unknown): SourceRowLocator | null => {
  const normalized = String(value || '').trim().toLowerCase();
  const match = normalized.match(
    /^(\d+)-(assigned|legacy-array|legacy-object)-(\d+)$/,
  );
  if (!match) return null;

  const rowId = Number.parseInt(match[1] || '', 10);
  const index = Number.parseInt(match[3] || '', 10);
  if (!Number.isFinite(rowId) || rowId <= 0) return null;
  if (!Number.isFinite(index) || index < 0) return null;

  return {
    rowId,
    bucket: match[2] as SourceRowLocator['bucket'],
    index,
  };
};

const hasStrongPartIdentity = (value: Record<string, unknown>) =>
  Boolean(normalizeToken(value.stock_id ?? value.id)) ||
  Boolean(resolvePartSerialToken(value));

const partsMatchStrict = (
  candidate: Record<string, unknown>,
  target: Record<string, unknown>,
) => {
  const candidateStockId = normalizeToken(candidate.stock_id ?? candidate.id);
  const targetStockId = normalizeToken(target.stock_id ?? target.id);
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
      candidateSerial &&
      targetSerial &&
      candidateSerial === targetSerial,
    );
  }

  return false;
};

const decrementStructuredQuantity = (
  entry: Record<string, unknown>,
  quantity: number,
) => {
  const requestedQty = toSafePositiveQuantity(quantity);
  const currentQty = toSafeNonNegativeQuantity(
    entry.quantity ?? entry.count ?? entry.available_stock ?? 0,
  );
  const movedQty = Math.min(currentQty, requestedQty);
  const remainingQty = Math.max(0, currentQty - movedQty);

  if (Object.prototype.hasOwnProperty.call(entry, 'count')) {
    entry.count = remainingQty;
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'quantity')) {
    entry.quantity = remainingQty;
  } else if (!Object.prototype.hasOwnProperty.call(entry, 'count')) {
    entry.quantity = remainingQty;
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'available_stock')) {
    entry.available_stock = remainingQty;
  }

  return { movedQty, remainingQty };
};

type LegacyEntryRef = {
  bucket: 'legacy-array' | 'legacy-object';
  index: number;
  entry: Record<string, unknown>;
  candidate: Record<string, unknown>;
};

const collectLegacyEntryRefs = (rawStock: unknown): LegacyEntryRef[] => {
  const refs: LegacyEntryRef[] = [];

  if (Array.isArray(rawStock)) {
    rawStock.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return;
      const entry = item as Record<string, unknown>;
      refs.push({
        bucket: 'legacy-array',
        index,
        entry,
        candidate: normalizePartRecord(entry),
      });
    });
    return refs;
  }

  if (!rawStock || typeof rawStock !== 'object') {
    return refs;
  }

  const stockRecord = rawStock as Record<string, unknown>;
  let objectIndex = 0;

  Object.entries(stockRecord).forEach(([topKey, topValue]) => {
    if (!topValue || typeof topValue !== 'object' || Array.isArray(topValue)) {
      return;
    }

    const topObject = topValue as Record<string, unknown>;
    const isDirectItem =
      Object.prototype.hasOwnProperty.call(topObject, 'count') ||
      Object.prototype.hasOwnProperty.call(topObject, 'quantity') ||
      Object.prototype.hasOwnProperty.call(topObject, 'description');

    if (isDirectItem) {
      refs.push({
        bucket: 'legacy-object',
        index: objectIndex++,
        entry: topObject,
        candidate: normalizePartRecord({
          ...topObject,
          code: topKey,
          supplier: 'Technician Stock',
        }),
      });
      return;
    }

    Object.entries(topObject).forEach(([childCode, childValue]) => {
      if (!childValue || typeof childValue !== 'object' || Array.isArray(childValue)) {
        return;
      }
      const entry = childValue as Record<string, unknown>;
      refs.push({
        bucket: 'legacy-object',
        index: objectIndex++,
        entry,
        candidate: normalizePartRecord({
          ...entry,
          code: childCode,
          supplier: topKey,
        }),
      });
    });
  });

  return refs;
};

// Helper function to add parts to technician stock
async function addPartsToTechnicianStock(
  supabase: SupabaseClient,
  technicianEmail: string,
  partsRequired: unknown[],
) {
  try {
    console.log(`[PARTS ASSIGNMENT] Starting parts assignment for technician: ${technicianEmail}`);
    console.log(`[PARTS ASSIGNMENT] Parts to assign:`, JSON.stringify(partsRequired, null, 2));
    const result = await appendAssignedPartsToTechnicianStock(
      supabase,
      technicianEmail,
      partsRequired,
    );
    if (!result.success) {
      console.error(`[PARTS ASSIGNMENT] ERROR:`, result.error);
      return { success: false, error: result.error };
    }
    console.log(`[PARTS ASSIGNMENT] SUCCESS: Added ${partsRequired.length} parts`);
    return {
      success: true,
      totalParts: result.totalParts,
      partsAdded: partsRequired.length,
    };
  } catch (error) {
    console.error(`[PARTS ASSIGNMENT] ERROR:`, error);
    return { success: false, error };
  }
}

export async function PUT(request: NextRequest, { params }) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const body = await request.json();
    const { inventory_items, technician_id, technician_name, technician_email, source, source_owner } = body;
    const parts = Array.isArray(inventory_items)
      ? inventory_items.map((part: Record<string, unknown>) =>
          normalizePartRecord(part || {}),
        )
      : [];
    const stockSource = (source || 'soltrack').toString().toLowerCase();
    const stockOwner = (source_owner || '').toString();

    let finalTechnicianEmail = extractFirstEmail(technician_email);

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Get the job card details first
    const { data: jobCard, error: jobError } = await supabase
      .from('job_cards')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !jobCard) {
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }
    if (!isEmailLike(finalTechnicianEmail)) {
      finalTechnicianEmail = extractFirstEmail(jobCard.technician_phone);
    }
    if (!isEmailLike(finalTechnicianEmail) && technician_id) {
      const { data: technicianRow } = await supabase
        .from('technicians')
        .select('email')
        .eq('id', technician_id)
        .maybeSingle();
      finalTechnicianEmail = extractFirstEmail(technicianRow?.email);
    }
    if (stockSource === 'client' && !stockOwner) {
      return NextResponse.json({ error: 'Client cost code is required' }, { status: 400 });
    }

    const technicianSourceEmail =
      stockSource === 'technician'
        ? extractFirstEmail(stockOwner || jobCard.technician_phone || technician_email || '')
        : '';

    if (stockSource === 'technician' && !technicianSourceEmail) {
      return NextResponse.json({ error: 'Technician email is required' }, { status: 400 });
    }

    const applySourceStockChanges = async () => {
      if (stockSource === 'soltrack') {
        for (const item of parts) {
          const itemId = item.stock_id || item.inventory_item_id || item.id;
          if (!itemId) continue;
          const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
          if (error) {
            return {
              success: false,
              warning: `Failed to remove one or more Soltrack stock items: ${error.message}`,
            };
          }
        }
        return { success: true };
      }

      if (stockSource === 'client') {
        for (const item of parts) {
          const itemId = item.stock_id || item.inventory_item_id || item.id;
          if (!itemId) continue;
          const { error } = await supabase
            .from('client_inventory_items')
            .delete()
            .eq('id', itemId);
          if (error) {
            return {
              success: false,
              warning: `Failed to remove one or more client stock items: ${error.message}`,
            };
          }
        }
        return { success: true };
      }

      if (stockSource === 'technician') {
        const parsedSelections = parts.map((selectedPart) => {
          const normalizedSelected = normalizePartRecord(selectedPart);
          const rowLocator = parseSourceRowLocator(normalizedSelected.row_id);
          return {
            normalizedSelected,
            rowLocator,
          };
        });

        if (parsedSelections.some((selection) => !selection.rowLocator)) {
          return {
            success: false,
            warning:
              'Selected technician stock item is stale. Please refresh and select exact rows again.',
          };
        }

        const requiredRowIds = Array.from(
          new Set(parsedSelections.map((selection) => selection.rowLocator?.rowId)),
        ).filter((rowId): rowId is number => Number.isFinite(rowId as number));

        if (requiredRowIds.length === 0) {
          return {
            success: false,
            warning:
              'Technician source stock row is not available. Please refresh and try again.',
          };
        }

        const { data: techStockRows, error: techFetchError } = await supabase
          .from('tech_stock')
          .select('id, technician_email, assigned_parts, stock')
          .ilike('technician_email', technicianSourceEmail)
          .in('id', requiredRowIds);

        if (techFetchError) {
          return {
            success: false,
            warning: `Failed to read technician source stock: ${techFetchError.message}`,
          };
        }

        const rowStates = new Map<
          number,
          {
            rowId: number;
            technicianEmail: string;
            assignedParts: unknown[];
            stock: unknown;
            legacyRefs: LegacyEntryRef[];
          }
        >();

        (Array.isArray(techStockRows) ? techStockRows : []).forEach((row) => {
          const rowId = Number(row?.id);
          if (!Number.isFinite(rowId) || rowId <= 0) return;

          const assignedParts = Array.isArray(row?.assigned_parts)
            ? row.assigned_parts.map((part: unknown) =>
                part && typeof part === 'object' && !Array.isArray(part)
                  ? JSON.parse(JSON.stringify(part))
                  : part,
              )
            : [];
          const stock = cloneStockValue(row?.stock);

          rowStates.set(rowId, {
            rowId,
            technicianEmail: String(row?.technician_email || technicianSourceEmail),
            assignedParts,
            stock,
            legacyRefs: collectLegacyEntryRefs(stock),
          });
        });

        if (rowStates.size !== requiredRowIds.length) {
          return {
            success: false,
            warning:
              'Selected technician stock row is stale. Please refresh and reselect items.',
          };
        }

        for (const selection of parsedSelections) {
          const normalizedSelected = selection.normalizedSelected;
          const rowLocator = selection.rowLocator as SourceRowLocator;
          const rowState = rowStates.get(rowLocator.rowId);

          if (!rowState) {
            return {
              success: false,
              warning:
                'Selected technician stock row is stale. Please refresh and reselect items.',
            };
          }

          const requiresIdentityCheck = hasStrongPartIdentity(normalizedSelected);
          let remainingQty = toSafePositiveQuantity(normalizedSelected.quantity);

          if (rowLocator.bucket === 'assigned') {
            const locatedPart = rowState.assignedParts[rowLocator.index];
            if (!locatedPart || typeof locatedPart !== 'object' || Array.isArray(locatedPart)) {
              return {
                success: false,
                warning:
                  'Selected technician stock item is stale. Please refresh and try again.',
              };
            }

            const locatedCandidate = normalizePartRecord(
              locatedPart as Record<string, unknown>,
            );
            if (
              requiresIdentityCheck &&
              !partsMatchStrict(locatedCandidate, normalizedSelected)
            ) {
              return {
                success: false,
                warning:
                  'Selected technician stock item changed. Please refresh and try again.',
              };
            }

            const { movedQty, remainingQty: locatedRemainingQty } =
              decrementStructuredQuantity(
                locatedPart as Record<string, unknown>,
                remainingQty,
              );
            if (locatedRemainingQty <= 0) {
              rowState.assignedParts[rowLocator.index] = null;
            }
            remainingQty -= movedQty;
          } else {
            const locatedLegacyEntry = rowState.legacyRefs.find(
              (entry) =>
                entry.bucket === rowLocator.bucket && entry.index === rowLocator.index,
            );
            if (!locatedLegacyEntry) {
              return {
                success: false,
                warning:
                  'Selected technician stock item is stale. Please refresh and try again.',
              };
            }
            if (
              requiresIdentityCheck &&
              !partsMatchStrict(locatedLegacyEntry.candidate, normalizedSelected)
            ) {
              return {
                success: false,
                warning:
                  'Selected technician stock item changed. Please refresh and try again.',
              };
            }

            const { movedQty } = decrementStructuredQuantity(
              locatedLegacyEntry.entry,
              remainingQty,
            );
            remainingQty -= movedQty;
          }

          if (remainingQty > 0) {
            return {
              success: false,
              warning:
                'Not enough source technician stock for one or more selected items. Please refresh and try again.',
            };
          }
        }

        for (const rowState of rowStates.values()) {
          const cleanedAssignedParts = rowState.assignedParts.flatMap((part: unknown) => {
            if (!part) return [];
            if (!part || typeof part !== 'object' || Array.isArray(part)) return [part];
            const partObject = part as Record<string, unknown>;
            const remainingQty = toSafeNonNegativeQuantity(
              partObject.quantity ?? partObject.count ?? partObject.available_stock ?? 0,
            );
            return remainingQty > 0 ? [partObject] : [];
          });

          const { error: techUpdateError } = await supabase
            .from('tech_stock')
            .update({
              assigned_parts: cleanedAssignedParts,
              stock: rowState.stock,
            })
            .eq('id', rowState.rowId)
            .ilike('technician_email', rowState.technicianEmail);

          if (techUpdateError) {
            return {
              success: false,
              warning: `Failed to update technician source stock: ${techUpdateError.message}`,
            };
          }
        }
      }

      return { success: true };
    };



    // Generate QR code
    const qrData = {
      job_number: jobCard.job_number,
      job_id: jobCard.id,
      assigned_parts: parts,
      technician: jobCard.technician_phone,
      assigned_date: new Date().toISOString()
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;

    // Prepare update data
    const updateData = {
      parts_required: parts,
      qr_code: qrCodeUrl,
      role: "admin",
      status: "admin_created",
      job_status: "pending",
      escalation_role: null,
      escalation_source_role: null,
      escalated_at: null,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };
    
    // If technician data is provided, update it too
    if (technician_id && technician_name && isEmailLike(finalTechnicianEmail)) {
      updateData.assigned_technician_id = technician_id;
      updateData.technician_name = technician_name;
      updateData.technician_phone = finalTechnicianEmail;
    }

    // Update job card
    const { data: updatedJob, error: updateError } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', jobId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update job card' }, { status: 500 });
    }

    // If technician is already assigned, copy parts to tech_stock
    let techStockMessage = '';
    let canApplySourceChanges = true;
    if (
      stockSource === 'soltrack' &&
      (isEmailLike(finalTechnicianEmail) || isEmailLike(extractFirstEmail(jobCard.technician_phone)))
    ) {
      const techEmail = isEmailLike(finalTechnicianEmail)
        ? finalTechnicianEmail
        : extractFirstEmail(jobCard.technician_phone);
      const result = await addPartsToTechnicianStock(supabase, techEmail, parts);
      
      if (result?.success) {
        techStockMessage = ` Parts copied to technician stock (${result.partsAdded} items).`;
      } else {
        techStockMessage = ` Warning: Failed to copy parts to technician stock.`;
        canApplySourceChanges = false;
      }
    }

    let sourceStockMessage = '';
    if (canApplySourceChanges) {
      const sourceMutation = await applySourceStockChanges();
      if (!sourceMutation.success && sourceMutation.warning) {
        sourceStockMessage = ` Warning: ${sourceMutation.warning}`;
      }
    } else if (stockSource === 'soltrack') {
      sourceStockMessage =
        ' Warning: Source stock was not removed because technician stock update failed.';
    }

    return NextResponse.json({
      message: (finalTechnicianEmail
        ? 'Parts and technician assigned successfully. Job moved to Admin.'
        : 'Parts assigned successfully. Job moved to Admin.') +
        techStockMessage +
        sourceStockMessage,
      job: updatedJob,
      qr_code: qrCodeUrl
    });

  } catch (error) {
    console.error('Error assigning parts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
