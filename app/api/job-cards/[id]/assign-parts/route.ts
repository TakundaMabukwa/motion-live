import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appendAssignedPartsToTechnicianStock } from '@/lib/server/tech-stock-assignment';
import type { SupabaseClient } from '@supabase/supabase-js';

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

const normalizeStockSource = (value: unknown) => {
  const normalized = String(value || 'soltrack')
    .trim()
    .toLowerCase();
  if (normalized === 'client' || normalized === 'technician' || normalized === 'soltrack') {
    return normalized;
  }
  return 'soltrack';
};

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
  normalized.source = normalizeStockSource(part?.source);
  normalized.source_owner = String(part?.source_owner ?? '').trim().toLowerCase();
  normalized.is_new_assignment = part?.is_new_assignment !== false;
  normalized.selection_key = String(part?.selection_key ?? '').trim();
  const recurringMultiplier = toRecurringMultiplier(
    part?.recurring_multiplier ?? part?.recurringMultiplier ?? 1,
  );
  normalized.recurring_multiplier = recurringMultiplier;
  normalized.recurring_multiplier_label = `${recurringMultiplier}x`;

  return normalized;
};

const getPartIdentityLabel = (part: Record<string, unknown>) =>
  String(
    part?.code ??
      part?.description ??
      part?.stock_id ??
      part?.id ??
      'item',
  ).trim() || 'item';

const normalizeToken = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

const normalizeMatchToken = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const parseQuoteLineItems = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    );
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === 'object' && !Array.isArray(item),
        );
      }
    } catch {
      return [];
    }
  }

  return [];
};

const toRecurringMultiplier = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(1, Math.floor(parsed));
};

const splitSerialTokens = (value: unknown) =>
  String(value ?? '')
    .split(/[\s,;/|]+/g)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

const extractQuoteLineSerialTokens = (line: Record<string, unknown>) => {
  const serialLikeValues: unknown[] = [
    line.serial_number,
    line.serial,
    line.serialNumber,
    line.ip_address,
    line.detail_value,
    line.detailValue,
    line.value,
  ];

  const description = String(line.description ?? '');
  if (description) {
    const valueMatch = description.match(/value\s*:\s*([^\n\r]+)/i);
    if (valueMatch?.[1]) {
      serialLikeValues.push(valueMatch[1]);
    }
  }

  const tokens = new Set<string>();
  serialLikeValues.forEach((raw) => {
    splitSerialTokens(raw).forEach((token) => {
      tokens.add(token);
    });
    const wholeToken = String(raw ?? '').trim().toLowerCase();
    if (wholeToken) tokens.add(wholeToken);
  });

  return tokens;
};

const findBestQuoteLineForPart = (
  part: Record<string, unknown>,
  quoteLines: Record<string, unknown>[],
) => {
  if (!quoteLines.length) return null;

  const partSerial = resolvePartSerialToken(part);
  const partCode = normalizeMatchToken(part.code ?? part.item_code);
  const partDescription = normalizeMatchToken(part.description);

  let bestLine: Record<string, unknown> | null = null;
  let bestScore = 0;

  for (const line of quoteLines) {
    let score = 0;

    const lineSerialTokens = extractQuoteLineSerialTokens(line);
    if (partSerial && lineSerialTokens.has(partSerial)) {
      score += 120;
    }

    const lineCode = normalizeMatchToken(line.code ?? line.item_code);
    if (partCode && lineCode && partCode === lineCode) {
      score += 80;
    } else if (partCode) {
      const lineJoined = normalizeMatchToken(
        [
          line.code,
          line.item_code,
          line.name,
          line.product,
          line.description,
          line.type,
          line.category,
        ]
          .filter(Boolean)
          .join(' '),
      );
      if (lineJoined && lineJoined.includes(partCode)) {
        score += 30;
      }
    }

    if (partDescription) {
      const lineDescription = normalizeMatchToken(
        [line.name, line.product, line.description, line.type, line.category]
          .filter(Boolean)
          .join(' '),
      );
      if (
        lineDescription &&
        (lineDescription.includes(partDescription) ||
          partDescription.includes(lineDescription))
      ) {
        score += 20;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }

  if (bestScore <= 0) return null;
  return bestLine;
};

const resolvePartRecurringMultiplier = (
  part: Record<string, unknown>,
  quoteLines: Record<string, unknown>[],
) => {
  const explicitMultiplier = toRecurringMultiplier(
    part.recurring_multiplier ?? part.recurringMultiplier,
  );
  if (explicitMultiplier > 1) {
    return explicitMultiplier;
  }

  const matchedQuoteLine = findBestQuoteLineForPart(part, quoteLines);
  if (!matchedQuoteLine) {
    return explicitMultiplier;
  }

  return toRecurringMultiplier(
    matchedQuoteLine.recurring_multiplier ?? matchedQuoteLine.recurringMultiplier,
  );
};

const resolvePartSerialToken = (value: Record<string, unknown>) =>
  normalizeToken(
    value.serial_number ?? value.serial ?? value.serialNumber ?? value.ip_address,
  );

const hasStrongPartIdentity = (value: Record<string, unknown>) =>
  Boolean(normalizeToken(value.stock_id ?? value.id)) ||
  Boolean(resolvePartSerialToken(value));

const hasPartSelectionIdentity = (value: Record<string, unknown>) =>
  hasStrongPartIdentity(value);

const partsMatchStrict = (
  candidate: Record<string, unknown>,
  target: Record<string, unknown>,
) => {
  const candidateSerial = resolvePartSerialToken(candidate);
  const targetSerial = resolvePartSerialToken(target);
  if (candidateSerial || targetSerial) {
    return Boolean(
      candidateSerial &&
      targetSerial &&
      candidateSerial === targetSerial,
    );
  }

  const candidateStockId = normalizeToken(candidate.stock_id ?? candidate.id);
  const targetStockId = normalizeToken(target.stock_id ?? target.id);
  if (candidateStockId || targetStockId) {
    return Boolean(
      candidateStockId &&
      targetStockId &&
      candidateStockId === targetStockId,
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
    const stockSource = normalizeStockSource(source);
    const stockOwner = (source_owner || '').toString();
    const partsForSourceMutation = parts.filter(
      (part) => part?.is_new_assignment !== false,
    );

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
    const quoteLineItems = parseQuoteLineItems(jobCard.quotation_products);
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

    const missingIdentityPart = partsForSourceMutation.find(
      (part) => !hasPartSelectionIdentity(part),
    );
    if (missingIdentityPart) {
      return NextResponse.json(
        {
          error: `No serial number or unique item identity found for selected stock item (${getPartIdentityLabel(missingIdentityPart)}).`,
        },
        { status: 409 },
      );
    }

    const applySourceStockChanges = async () => {
      if (partsForSourceMutation.length === 0) {
        return { success: true };
      }

      const partsBySource = {
        soltrack: [] as Record<string, unknown>[],
        client: [] as Record<string, unknown>[],
        technician: [] as Record<string, unknown>[],
      };

      partsForSourceMutation.forEach((part) => {
        const mutationSource = normalizeStockSource(part?.source ?? stockSource);
        partsBySource[mutationSource].push(part);
      });

      for (const item of partsBySource.soltrack) {
        const itemId = item.stock_id || item.inventory_item_id || item.id;
        if (!itemId) continue;
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', itemId);
        if (error) {
          return {
            success: false,
            warning: `Failed to remove one or more Soltrack stock items: ${error.message}`,
          };
        }
      }

      for (const item of partsBySource.client) {
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

      if (partsBySource.technician.length === 0) {
        return { success: true };
      }

      const technicianPartsByOwner = new Map<string, Record<string, unknown>[]>();
      for (const part of partsBySource.technician) {
        const partOwner = extractFirstEmail(
          part?.source_owner ||
            technicianSourceEmail ||
            stockOwner ||
            jobCard.technician_phone ||
            technician_email ||
            '',
        );
        if (!partOwner) {
          return {
            success: false,
            warning:
              'Technician email is required for technician stock booking. Please refresh and select technician stock again.',
          };
        }
        const existing = technicianPartsByOwner.get(partOwner) || [];
        existing.push(part);
        technicianPartsByOwner.set(partOwner, existing);
      }

      for (const [technicianEmailForMutation, technicianParts] of technicianPartsByOwner.entries()) {
        const normalizedParts = technicianParts
          .map((p) => normalizePartRecord(p))
          .filter((p) => resolvePartSerialToken(p) || String(p.stock_id || p.id || '').trim());

        if (normalizedParts.length === 0) continue;

        const { data: techStockRow, error: techFetchError } = await supabase
          .from('tech_stock')
          .select('id, technician_email, assigned_parts')
          .ilike('technician_email', technicianEmailForMutation)
          .limit(1)
          .maybeSingle();

        if (techFetchError) {
          return {
            success: false,
            warning: `Failed to read technician source stock: ${techFetchError.message}`,
          };
        }
        if (!techStockRow) {
          return {
            success: false,
            warning: `No tech stock row found for ${technicianEmailForMutation}. Please refresh and try again.`,
          };
        }

        const assignedParts: Record<string, unknown>[] = Array.isArray(techStockRow.assigned_parts)
          ? techStockRow.assigned_parts.map((p: unknown) =>
              p && typeof p === 'object' && !Array.isArray(p)
                ? JSON.parse(JSON.stringify(p))
                : null,
            ).filter(Boolean)
          : [];

        for (const selected of normalizedParts) {
          const serial = resolvePartSerialToken(selected);
          const stockId = String(selected.stock_id || selected.id || '').trim();
          const requestedQty = toSafePositiveQuantity(selected.quantity);

          let partIndex = -1;

          if (serial) {
            const serialMatches = assignedParts
              .map((p, idx) => ({ p, idx }))
              .filter(({ p }) => resolvePartSerialToken(p) === serial);

            if (serialMatches.length === 1) {
              partIndex = serialMatches[0].idx;
            } else if (serialMatches.length > 1 && stockId) {
              const match = serialMatches.find(
                ({ p }) => String(p.stock_id || p.id || '') === stockId,
              );
              if (match) partIndex = match.idx;
            }
          }

          if (partIndex < 0 && stockId) {
            partIndex = assignedParts.findIndex(
              (p) => String(p.stock_id || p.id || '') === stockId,
            );
          }

          if (partIndex < 0) {
            return {
              success: false,
              warning: `Stock item (S/N: ${serial || 'N/A'}, ID: ${stockId || 'N/A'}) not found in technician stock. Please refresh and try again.`,
            };
          }

          const part = assignedParts[partIndex];
          const currentQty = toSafeNonNegativeQuantity(part.quantity ?? part.count ?? 1);
          const remaining = Math.max(0, currentQty - requestedQty);

          if (remaining <= 0) {
            assignedParts.splice(partIndex, 1);
          } else {
            if (Object.prototype.hasOwnProperty.call(part, 'quantity')) {
              part.quantity = remaining;
            }
            if (Object.prototype.hasOwnProperty.call(part, 'count')) {
              part.count = remaining;
            }
            if (Object.prototype.hasOwnProperty.call(part, 'available_stock')) {
              part.available_stock = remaining;
            }
          }
        }

        const { error: techUpdateError } = await supabase
          .from('tech_stock')
          .update({ assigned_parts: assignedParts })
          .eq('id', techStockRow.id);

        if (techUpdateError) {
          return {
            success: false,
            warning: `Failed to update technician source stock: ${techUpdateError.message}`,
          };
        }
      }

      return { success: true };
    };



    // Generate QR code
    const persistedParts = parts.map((part) => {
      const sanitized = { ...part };
      delete sanitized.is_new_assignment;
      const recurringMultiplier = resolvePartRecurringMultiplier(
        sanitized,
        quoteLineItems,
      );
      sanitized.recurring_multiplier = recurringMultiplier;
      sanitized.recurring_multiplier_label = `${recurringMultiplier}x`;
      return sanitized;
    });

    const qrData = {
      job_number: jobCard.job_number,
      job_id: jobCard.id,
      assigned_parts: persistedParts,
      technician: jobCard.technician_phone,
      assigned_date: new Date().toISOString()
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;

    // Prepare update data
    const updateData = {
      parts_required: persistedParts,
      qr_code: qrCodeUrl,
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
    const partsForTechnicianCopy = partsForSourceMutation.filter(
      (part) => normalizeStockSource(part?.source ?? stockSource) === 'soltrack',
    );

    if (
      partsForTechnicianCopy.length > 0 &&
      (isEmailLike(finalTechnicianEmail) || isEmailLike(extractFirstEmail(jobCard.technician_phone)))
    ) {
      const techEmail = isEmailLike(finalTechnicianEmail)
        ? finalTechnicianEmail
        : extractFirstEmail(jobCard.technician_phone);
      const result = await addPartsToTechnicianStock(supabase, techEmail, partsForTechnicianCopy);
      
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
    } else if (partsForTechnicianCopy.length > 0) {
      sourceStockMessage =
        ' Warning: Source stock was not removed because technician stock update failed.';
    }

    return NextResponse.json({
      message: (finalTechnicianEmail
        ? 'Parts and technician assigned successfully.'
        : 'Parts assigned successfully.') +
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
