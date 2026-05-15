import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OPTIONAL_JOB_CARD_COLUMNS = [
  'vehicle_chassis',
  'vehicle_colour',
  'old_serial_number',
  'new_serial_number',
  'cost_center_code',
  'cost_center_name',
] as const;

const MOVE_TO_ROLE_ALLOWED = new Set(['inv', 'admin', 'accounts', 'none']);

function normalizeMoveToRole(value: unknown): string | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;

  const aliasMap: Record<string, string> = {
    inv: 'inv',
    inventory: 'inv',
    admin: 'admin',
    accounts: 'accounts',
    account: 'accounts',
    none: 'none',
    null: 'none',
  };

  const normalized = aliasMap[raw] ?? raw;
  return MOVE_TO_ROLE_ALLOWED.has(normalized) ? normalized : null;
}

const normalizeToken = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

const normalizeEmailValue = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

const isValidSingleTechnicianEmail = (value: unknown) => {
  const email = normalizeEmailValue(value);
  if (!email) return false;
  if (email.includes(',') || email.includes(' ')) return false;
  return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email);
};

const extractSingleTechnicianEmail = (...candidates: unknown[]) => {
  for (const candidate of candidates) {
    const token = String(candidate ?? '')
      .split(',')
      .map((part) => part.trim())
      .find(Boolean);
    if (!token) continue;
    const normalized = normalizeEmailValue(token);
    if (isValidSingleTechnicianEmail(normalized)) {
      return normalized;
    }
  }
  return '';
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

type TransferRowLocator = {
  rowId: number;
  bucket: 'assigned' | 'legacy-array' | 'legacy-object';
  index: number;
};

const parseTransferRowLocator = (value: unknown): TransferRowLocator | null => {
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
    bucket: match[2] as TransferRowLocator['bucket'],
    index,
  };
};

const resolvePartSerialToken = (value: Record<string, unknown>) =>
  normalizeToken(
    value.serial_number ?? value.serial ?? value.serialNumber ?? value.ip_address,
  );

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
      candidateSerial && targetSerial && candidateSerial === targetSerial,
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

const cloneStockValue = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return JSON.parse(JSON.stringify(value));
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

function resolvePartSerial(value: Record<string, unknown>): string {
  return String(
    value?.serial_number ??
      value?.serial ??
      value?.serialNumber ??
      value?.ip_address ??
      '',
  ).trim();
}

function normalizePartRecord(value: unknown): Record<string, unknown> {
  const part =
    value && typeof value === 'object' && !Array.isArray(value)
      ? ({ ...(value as Record<string, unknown>) } as Record<string, unknown>)
      : {};

  const serialNumber = resolvePartSerial(part);

  return {
    ...part,
    description: String(
      (part as Record<string, unknown>).description ??
        (part as Record<string, unknown>).name ??
        (part as Record<string, unknown>).item_description ??
        (part as Record<string, unknown>).code ??
        'Item',
    ).trim(),
    code: String(
      (part as Record<string, unknown>).code ??
        (part as Record<string, unknown>).category_code ??
        '',
    ).trim(),
    quantity: Math.max(
      1,
      Number(
        (part as Record<string, unknown>).quantity ??
          (part as Record<string, unknown>).count ??
          1,
      ) || 1,
    ),
    serial_number: serialNumber,
    ip_address: String((part as Record<string, unknown>).ip_address ?? '').trim(),
  };
}

function normalizePartArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((part) => normalizePartRecord(part));
}

function getPartIdentityLabel(part: Record<string, unknown>): string {
  return String(
    part.code ??
      part.description ??
      part.stock_id ??
      part.id ??
      'item',
  ).trim() || 'item';
}

function stripOptionalJobCardColumns<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload };
  for (const column of OPTIONAL_JOB_CARD_COLUMNS) {
    delete next[column];
  }
  return next;
}

function isMissingOptionalJobCardColumn(message?: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return OPTIONAL_JOB_CARD_COLUMNS.some((column) => normalized.includes(column));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const view = request.nextUrl.searchParams.get('view') || '';

    const fcEditSelect =
      'id, job_number, order_number, account_id, new_account_number, cost_center_code, cost_center_name, customer_name, customer_email, customer_phone, customer_address, contact_person, job_type, job_sub_type, job_description, purchase_type, decommission_date, annuity_end_date, move_to_role, move_to, vehicle_registration, vehicle_make, vehicle_model, vehicle_year, vin_numer, odormeter, quote_notes, quote_email_subject, quote_email_body, quote_email_footer, quotation_products, deinstall_vehicles, completion_notes, fc_note_acknowledged, status, job_status, role, escalation_role, escalation_source_role, created_at, updated_at';

    const requestedSelect = view === 'fc-edit' ? fcEditSelect : '*';

    // Fetch the job card by ID
    let { data: job, error: fetchError } = await supabase
      .from('job_cards')
      .select(requestedSelect)
      .eq('id', id)
      .single();

    if (fetchError && view === 'fc-edit') {
      const fallbackQuery = await supabase
        .from('job_cards')
        .select('*')
        .eq('id', id)
        .single();
      job = fallbackQuery.data;
      fetchError = fallbackQuery.error;
    }

    if (fetchError) {
      console.error('Error fetching job card:', fetchError);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);

  } catch (error) {
    console.error('Error in job-cards GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const transferEquipmentFromAssignedParts = body.transfer_equipment_from_assigned_parts === true;

    // Get current job card to check if it's being completed
    const { data: currentJob, error: fetchError } = await supabase
      .from('job_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current job card:', fetchError);
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    // Check if job is being completed (status changing to 'Completed')
    const isBeingCompleted = body.job_status === 'Completed' && 
                            currentJob.job_status !== 'Completed';

    if (isBeingCompleted) {
      const partsRequired = normalizePartArray(currentJob.parts_required);
      const missingSerialParts = partsRequired.filter(
        (part) => !resolvePartSerialToken(part),
      );
      if (missingSerialParts.length > 0) {
        const sample = missingSerialParts
          .slice(0, 5)
          .map((part) => getPartIdentityLabel(part))
          .join(', ');
        return NextResponse.json(
          {
            error: `Cannot complete job. Missing serial number on ${missingSerialParts.length} part(s): ${sample}`,
            missing_serial_count: missingSerialParts.length,
          },
          { status: 409 },
        );
      }
    }

    // Prepare update data - remove technician if job is being completed
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    if (Array.isArray(updateData.parts_required)) {
      updateData.parts_required = normalizePartArray(updateData.parts_required);
    }

    if (Array.isArray(updateData.equipment_used)) {
      updateData.equipment_used = normalizePartArray(updateData.equipment_used);
    }

    // Keep move_to_role constrained-safe on every update.
    // This auto-fixes legacy rows that still carry invalid values (e.g. "fc").
    const requestedMoveToRole =
      body.move_to_role ??
      body.moveToRole ??
      body.move_to ??
      body.moveTo ??
      currentJob?.move_to_role ??
      null;
    updateData.move_to_role = normalizeMoveToRole(requestedMoveToRole);

    delete updateData.transfer_equipment_from_assigned_parts;
    let pendingTechStockUpdates: Array<{
      rowId: number;
      technicianEmail: string;
      originalAssignedParts: unknown[];
      originalStock: unknown;
      nextAssignedParts: unknown[];
      nextStock: unknown;
    }> = [];

    // Optional flow: move selected equipment from tech_stock.assigned_parts onto this job card.
    if (transferEquipmentFromAssignedParts && Array.isArray(body.equipment_used)) {
      const selectedEquipment = normalizePartArray(body.equipment_used);

      if (selectedEquipment.length > 0) {
        const technicianEmailForTransfer = extractSingleTechnicianEmail(
          currentJob.technician_phone,
          user.email,
        );

        if (!technicianEmailForTransfer) {
          return NextResponse.json(
            {
              error:
                'Unable to resolve a single technician stock email for transfer. Please refresh and try again.',
            },
            { status: 409 },
          );
        }

        const { data: techStockRows, error: techStockError } = await supabase
          .from('tech_stock')
          .select('id, assigned_parts, stock, technician_email')
          .ilike('technician_email', technicianEmailForTransfer)
          .order('id', { ascending: true });

        if (techStockError) {
          console.error('Error fetching tech stock for transfer:', techStockError);
          return NextResponse.json(
            { error: 'Failed to load technician stock for transfer' },
            { status: 500 },
          );
        }

        const sourceRows = Array.isArray(techStockRows) ? techStockRows : [];
        if (sourceRows.length === 0) {
          return NextResponse.json(
            {
              error:
                'Technician stock row was not found. Please refresh and try again.',
            },
            { status: 409 },
          );
        }

        const rowStates = new Map<
          number,
          {
            rowId: number;
            technicianEmail: string;
            assignedParts: unknown[];
            originalAssignedParts: unknown[];
            stock: unknown;
            originalStock: unknown;
            legacyRefs: LegacyEntryRef[];
          }
        >();

        sourceRows.forEach((row) => {
          const rowId = Number(row.id);
          if (!Number.isFinite(rowId) || rowId <= 0) return;

          const assignedParts = Array.isArray(row.assigned_parts)
            ? row.assigned_parts.map((part: unknown) =>
                part && typeof part === 'object' && !Array.isArray(part)
                  ? JSON.parse(JSON.stringify(part))
                  : part,
              )
            : [];
          const stock = cloneStockValue(row.stock);

          rowStates.set(rowId, {
            rowId,
            technicianEmail: String(row.technician_email || technicianEmailForTransfer),
            assignedParts,
            originalAssignedParts: Array.isArray(row.assigned_parts)
              ? [...row.assigned_parts]
              : [],
            stock,
            originalStock: cloneStockValue(row.stock),
            legacyRefs: collectLegacyEntryRefs(stock),
          });
        });

        const transferredParts: Record<string, unknown>[] = [];
        const touchedRowIds = new Set<number>();

        for (const selectedPart of selectedEquipment) {
          const normalizedSelected = normalizePartRecord(selectedPart);
          const selectedSerial = resolvePartSerialToken(normalizedSelected);
          if (!selectedSerial) {
            return NextResponse.json(
              {
                error: `No serial number found for selected stock item (${getPartIdentityLabel(normalizedSelected)}).`,
              },
              { status: 409 },
            );
          }
          const rowLocator = parseTransferRowLocator(normalizedSelected.row_id);
          if (!rowLocator) {
            return NextResponse.json(
              {
                error:
                  'Selected stock item is stale or missing row identity. Please refresh and select again.',
              },
              { status: 409 },
            );
          }

          const rowState = rowStates.get(rowLocator.rowId);
          if (!rowState) {
            return NextResponse.json(
              {
                error:
                  'Selected technician stock row is stale. Please refresh and reselect items.',
              },
              { status: 409 },
            );
          }
          touchedRowIds.add(rowState.rowId);

          const requiresIdentityCheck = hasStrongPartIdentity(normalizedSelected);
          let remainingQty = toSafePositiveQuantity(normalizedSelected.quantity);

          if (rowLocator.bucket === 'assigned') {
            const locatedPart = rowState.assignedParts[rowLocator.index];
            if (!locatedPart || typeof locatedPart !== 'object' || Array.isArray(locatedPart)) {
              return NextResponse.json(
                {
                  error:
                    'Selected technician stock item is stale. Please refresh and try again.',
                },
                { status: 409 },
              );
            }

            const locatedCandidate = normalizePartRecord(
              locatedPart as Record<string, unknown>,
            );
            if (!resolvePartSerialToken(locatedCandidate)) {
              return NextResponse.json(
                {
                  error: `No serial number found in technician stock for selected item (${getPartIdentityLabel(locatedCandidate)}).`,
                },
                { status: 409 },
              );
            }
            if (
              requiresIdentityCheck &&
              !partsMatchStrict(locatedCandidate, normalizedSelected)
            ) {
              return NextResponse.json(
                {
                  error:
                    'Selected technician stock item changed. Please refresh and try again.',
                },
                { status: 409 },
              );
            }

            const { movedQty, remainingQty: locatedRemainingQty } =
              decrementStructuredQuantity(
                locatedPart as Record<string, unknown>,
                remainingQty,
              );

            if (movedQty > 0) {
              transferredParts.push({
                ...locatedCandidate,
                quantity: movedQty,
                available_stock: movedQty,
                row_id: normalizedSelected.row_id,
                source: 'tech_stock.assigned_parts',
              });
            }

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
              return NextResponse.json(
                {
                  error:
                    'Selected technician stock item is stale. Please refresh and try again.',
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
              !partsMatchStrict(locatedLegacyEntry.candidate, normalizedSelected)
            ) {
              return NextResponse.json(
                {
                  error:
                    'Selected technician stock item changed. Please refresh and try again.',
                },
                { status: 409 },
              );
            }

            const { movedQty } = decrementStructuredQuantity(
              locatedLegacyEntry.entry,
              remainingQty,
            );

            if (movedQty > 0) {
              transferredParts.push({
                ...normalizePartRecord({
                  ...locatedLegacyEntry.candidate,
                  ...normalizedSelected,
                }),
                quantity: movedQty,
                available_stock: movedQty,
                row_id: normalizedSelected.row_id,
                source: 'tech_stock.assigned_parts',
              });
            }

            remainingQty -= movedQty;
          }

          if (remainingQty > 0) {
            return NextResponse.json(
              {
                error:
                  'Not enough stock available for one or more selected items. Please refresh and try again.',
              },
              { status: 400 },
            );
          }
        }

        if (transferredParts.length === 0) {
          return NextResponse.json(
            {
              error:
                'No stock was transferred. Please refresh and select stock items again.',
            },
            { status: 409 },
          );
        }

        pendingTechStockUpdates = Array.from(rowStates.values())
          .filter((rowState) => touchedRowIds.has(rowState.rowId))
          .map((rowState) => {
          const nextAssignedParts = rowState.assignedParts.flatMap((part: unknown) => {
            if (!part) return [];
            if (!part || typeof part !== 'object' || Array.isArray(part)) return [part];
            const partObject = part as Record<string, unknown>;
            const remainingQty = toSafeNonNegativeQuantity(
              partObject.quantity ?? partObject.count ?? partObject.available_stock ?? 0,
            );
            return remainingQty > 0 ? [partObject] : [];
          });

          return {
            rowId: rowState.rowId,
            technicianEmail: rowState.technicianEmail,
            originalAssignedParts: rowState.originalAssignedParts,
            originalStock: rowState.originalStock,
            nextAssignedParts,
            nextStock: rowState.stock,
          };
        });

        const existingPartsRequired = Array.isArray(currentJob.parts_required)
          ? currentJob.parts_required
          : [];
        const existingEquipmentUsed = Array.isArray(currentJob.equipment_used)
          ? currentJob.equipment_used
          : [];

        updateData.parts_required = [...existingPartsRequired, ...transferredParts];
        updateData.equipment_used = [...existingEquipmentUsed, ...transferredParts];
      }
    }

    // If job is being completed, remove technician assignment
    if (isBeingCompleted) {
      updateData.assigned_technician_id = null;
      updateData.technician_name = null;
      updateData.technician_phone = null;
      updateData.move_to_role = null;
    }

    let appliedTechStockUpdates = false;
    const appliedStockRows: typeof pendingTechStockUpdates = [];
    if (pendingTechStockUpdates.length > 0) {
      for (const rowUpdate of pendingTechStockUpdates) {
        const { error: updateTechStockError } = await supabase
          .from('tech_stock')
          .update({
            assigned_parts: rowUpdate.nextAssignedParts,
            stock: rowUpdate.nextStock,
          })
          .eq('id', rowUpdate.rowId)
          .ilike('technician_email', rowUpdate.technicianEmail);

        if (updateTechStockError) {
          console.error('Error updating tech stock during transfer:', updateTechStockError);

          for (const rollbackUpdate of appliedStockRows) {
            const { error: rollbackError } = await supabase
              .from('tech_stock')
              .update({
                assigned_parts: rollbackUpdate.originalAssignedParts,
                stock: rollbackUpdate.originalStock,
              })
              .eq('id', rollbackUpdate.rowId);

            if (rollbackError) {
              console.error(
                'Failed to rollback technician stock after transfer update failure:',
                rollbackError,
              );
            }
          }

          return NextResponse.json(
            {
              error: 'Failed to move technician stock. Please refresh and try again.',
            },
            { status: 500 },
          );
        }

        appliedStockRows.push(rowUpdate);
      }
      appliedTechStockUpdates = true;
    }

    // Update the job card
    let { data: updatedJob, error: updateError } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError && isMissingOptionalJobCardColumn(updateError.message)) {
      const fallbackUpdateData = stripOptionalJobCardColumns(updateData);
      ({ data: updatedJob, error: updateError } = await supabase
        .from('job_cards')
        .update(fallbackUpdateData)
        .eq('id', id)
        .select()
        .single());
    }

    if (updateError) {
      if (appliedTechStockUpdates) {
        for (const rollbackUpdate of pendingTechStockUpdates) {
          const { error: rollbackError } = await supabase
            .from('tech_stock')
            .update({
              assigned_parts: rollbackUpdate.originalAssignedParts,
              stock: rollbackUpdate.originalStock,
            })
            .eq('id', rollbackUpdate.rowId);

          if (rollbackError) {
            console.error(
              'Failed to rollback technician stock after job update failure:',
              rollbackError,
            );
          }
        }
      }

      console.error('Error updating job card:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update job card',
          details: updateError.message || updateError.details || 'Unknown database error',
        },
        { status: 500 }
      );
    }

    // If job is being completed, handle vehicle addition and stock deduction
    if (isBeingCompleted) {
      try {
        // First, deduct stock from technician's boot stock
        if (currentJob.technician_phone && currentJob.parts_required && currentJob.assigned_technician_id) {
          console.log(`Deducting stock for technician: ${currentJob.technician_phone} (ID: ${currentJob.assigned_technician_id})`);
          await deductTechnicianStock(currentJob.technician_phone, currentJob.parts_required, currentJob.assigned_technician_id);
        }

        // Handle vehicle addition directly (avoid internal API-to-API round-trip).
        await addVehicleToInventoryIfInstall(updatedJob);
      } catch (error) {
        console.error('Error processing job completion:', error);
        // Don't fail the job completion if vehicle processing fails
      }
    }

    async function addVehicleToInventoryIfInstall(jobCard: any) {
      const jobType = String(jobCard?.job_type || '').toLowerCase();
      const isInstallJob = jobType === 'install' || jobType === 'installation';

      if (!isInstallJob) {
        console.log('Job completion processed: Job completed successfully. Vehicle not added to inventory (not an install job)');
        return;
      }

      const vehicleData = {
        reg: jobCard.vehicle_registration || '',
        vin: jobCard.vehicle_chassis || jobCard.vin_numer || '',
        make: jobCard.vehicle_make || '',
        model: jobCard.vehicle_model || '',
        year: jobCard.vehicle_year?.toString() || '',
        colour: jobCard.vehicle_colour || 'Unknown',
        company: jobCard.customer_name || 'Unknown Company',
        new_account_number: jobCard.new_account_number || `JOB-${jobCard.job_number}`,
        branch: null,
        fleet_number: null,
        engine: null,
        skylink_trailer_unit_ip: jobCard.ip_address || null,
        total_rental_sub: jobCard.quotation_total_amount || 0,
        total_rental: jobCard.quotation_subtotal || 0,
        total_sub: jobCard.quotation_vat_amount || 0
      };

      const { error: vehiclesError } = await supabase
        .from('vehicles')
        .insert([vehicleData]);

      if (vehiclesError) {
        console.error('Failed to process job completion: Failed to add vehicle to inventory', vehiclesError);
        return;
      }

      console.log('Job completion processed: Install job completed - Vehicle successfully added to vehicles table');
    }

    // Function to deduct stock from technician's boot stock
    async function deductTechnicianStock(technicianEmail: string, partsRequired: any[], technicianId: string) {
      try {
        console.log(`Attempting to deduct stock for technician: ${technicianEmail}`);
        
        // Validate that the technician email matches the assigned technician
        if (!technicianEmail || !technicianId) {
          console.log('Missing technician email or ID, skipping stock deduction');
          return;
        }
        const normalizedTechnicianEmail = normalizeEmailValue(technicianEmail);
        if (!isValidSingleTechnicianEmail(normalizedTechnicianEmail)) {
          console.log('Invalid technician email, skipping stock deduction');
          return;
        }

        // Get technician's current stock (case-insensitive, deterministic row)
        const { data: techStockRows, error: fetchError } = await supabase
          .from('tech_stock')
          .select('id, assigned_parts, technician_email')
          .ilike('technician_email', normalizedTechnicianEmail)
          .order('id', { ascending: true })
          .limit(1);

        if (fetchError || !Array.isArray(techStockRows) || techStockRows.length === 0) {
          console.log('No tech stock found for technician:', technicianEmail);
          return;
        }
        const techStock = techStockRows[0];

        // Double-check that we have the correct technician's stock
        if (normalizeEmailValue(techStock.technician_email) !== normalizedTechnicianEmail) {
          console.error(`Technician email mismatch! Expected: ${normalizedTechnicianEmail}, Got: ${techStock.technician_email}`);
          return;
        }

        const assignedParts = Array.isArray(techStock.assigned_parts) ? techStock.assigned_parts : [];
        let updatedParts = [...assignedParts];
        let stockDeducted = false;

        // Match parts by serial identity (never by code) and deduct quantities.
        partsRequired.forEach((requiredPart: Record<string, unknown>) => {
          const requiredSerial = resolvePartSerialToken(requiredPart || {});
          if (!requiredSerial) {
            throw new Error(
              `Cannot deduct stock: no serial number on required part (${getPartIdentityLabel(requiredPart || {})}).`,
            );
          }
          const requiredQty = toSafePositiveQuantity(requiredPart?.quantity ?? 1);

          const stockIndex = updatedParts.findIndex((stockPart: unknown) => {
            if (!stockPart || typeof stockPart !== 'object' || Array.isArray(stockPart)) {
              return false;
            }
            const stockPartRecord = stockPart as Record<string, unknown>;
            const stockSerial = resolvePartSerialToken(stockPartRecord);
            const bootStockFlag = String(stockPartRecord.boot_stock || '').trim().toLowerCase();
            return stockSerial === requiredSerial && bootStockFlag === 'yes';
          });

          if (stockIndex !== -1) {
            const currentQty = toSafeNonNegativeQuantity(
              (updatedParts[stockIndex] as Record<string, unknown>)?.quantity,
            );
            const newQty = Math.max(0, currentQty - requiredQty);
            
            updatedParts[stockIndex] = {
              ...updatedParts[stockIndex],
              quantity: newQty,
              available_stock: newQty
            };
            
            stockDeducted = true;
            console.log(`Deducted ${requiredQty} of serial ${requiredSerial} from technician stock`);
          }
        });

        // Update technician's stock if any deductions were made
        if (stockDeducted) {
          const { error: updateError } = await supabase
            .from('tech_stock')
            .update({ assigned_parts: updatedParts })
            .eq('id', techStock.id)
            .ilike('technician_email', normalizedTechnicianEmail);

          if (updateError) {
            console.error('Error updating technician stock:', updateError);
          } else {
            console.log('Successfully updated technician stock');
          }
        }
      } catch (error) {
        console.error('Error deducting technician stock:', error);
      }
    }

    return NextResponse.json(updatedJob);

  } catch (error) {
    console.error('Error in job-cards PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
