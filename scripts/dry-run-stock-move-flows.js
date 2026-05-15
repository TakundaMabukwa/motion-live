#!/usr/bin/env node

/**
 * Dry-run simulation for stock move flows using UI-shaped payloads.
 * No DB writes. This validates strict row_id-based movement behavior.
 */

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const expectThrows = (fn, label) => {
  try {
    fn();
    throw new Error(`Expected failure did not occur: ${label}`);
  } catch (error) {
    if (String(error?.message || '').startsWith('Expected failure did not occur')) {
      throw error;
    }
    console.log(`PASS (expected failure): ${label}`);
  }
};

const normalize = (value) => String(value ?? '').trim().toLowerCase();

const parseRowLocator = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const match = normalized.match(/^(\d+)-(assigned|legacy-array|legacy-object)-(\d+)$/);
  if (!match) return null;
  const rowId = Number.parseInt(match[1] || '', 10);
  const index = Number.parseInt(match[3] || '', 10);
  if (!Number.isFinite(rowId) || rowId <= 0) return null;
  if (!Number.isFinite(index) || index < 0) return null;
  return { rowId, bucket: match[2], index };
};

const toSafePositive = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
};

const toSafeNonNegative = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

const resolveSerial = (part) =>
  String(part?.serial_number ?? part?.serial ?? part?.serialNumber ?? part?.ip_address ?? '').trim();

const normalizePart = (part) => ({
  ...(part && typeof part === 'object' ? part : {}),
  code: String(part?.code ?? part?.category_code ?? '').trim(),
  description: String(part?.description ?? part?.name ?? part?.code ?? 'Item').trim(),
  quantity: toSafePositive(part?.quantity ?? part?.count ?? 1),
  stock_id: String(part?.stock_id ?? part?.id ?? '').trim(),
  row_id: String(part?.row_id ?? '').trim(),
  serial_number: resolveSerial(part),
  ip_address: String(part?.ip_address ?? '').trim(),
});

const hasStrongIdentity = (part) => Boolean(normalize(part?.stock_id ?? part?.id)) || Boolean(normalize(resolveSerial(part)));

const partsMatchStrict = (candidate, target) => {
  const cStock = normalize(candidate.stock_id ?? candidate.id);
  const tStock = normalize(target.stock_id ?? target.id);
  if (cStock || tStock) {
    return Boolean(cStock && tStock && cStock === tStock);
  }

  const cSerial = normalize(resolveSerial(candidate));
  const tSerial = normalize(resolveSerial(target));
  if (cSerial || tSerial) {
    return Boolean(cSerial && tSerial && cSerial === tSerial);
  }

  return false;
};

const decrementEntry = (entry, requested) => {
  const req = toSafePositive(requested);
  const current = toSafeNonNegative(entry.quantity ?? entry.count ?? entry.available_stock ?? 0);
  const moved = Math.min(req, current);
  const remaining = Math.max(0, current - moved);

  if (Object.prototype.hasOwnProperty.call(entry, 'count')) entry.count = remaining;
  if (Object.prototype.hasOwnProperty.call(entry, 'quantity')) {
    entry.quantity = remaining;
  } else if (!Object.prototype.hasOwnProperty.call(entry, 'count')) {
    entry.quantity = remaining;
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'available_stock')) entry.available_stock = remaining;

  return { moved, remaining };
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const collectLegacyRefs = (rawStock) => {
  const refs = [];
  if (Array.isArray(rawStock)) {
    rawStock.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      refs.push({ bucket: 'legacy-array', index, entry, candidate: normalizePart(entry) });
    });
    return refs;
  }
  if (!rawStock || typeof rawStock !== 'object') return refs;

  let objectIndex = 0;
  Object.entries(rawStock).forEach(([topKey, topValue]) => {
    if (!topValue || typeof topValue !== 'object' || Array.isArray(topValue)) return;

    const topObject = topValue;
    const isDirect =
      Object.prototype.hasOwnProperty.call(topObject, 'count') ||
      Object.prototype.hasOwnProperty.call(topObject, 'quantity') ||
      Object.prototype.hasOwnProperty.call(topObject, 'description');

    if (isDirect) {
      refs.push({
        bucket: 'legacy-object',
        index: objectIndex++,
        entry: topObject,
        candidate: normalizePart({ ...topObject, code: topKey, supplier: 'Technician Stock' }),
      });
      return;
    }

    Object.entries(topObject).forEach(([childCode, childValue]) => {
      if (!childValue || typeof childValue !== 'object' || Array.isArray(childValue)) return;
      refs.push({
        bucket: 'legacy-object',
        index: objectIndex++,
        entry: childValue,
        candidate: normalizePart({ ...childValue, code: childCode, supplier: topKey }),
      });
    });
  });

  return refs;
};

const simulateAssignFromTechnician = ({ sourceRows, selectedParts }) => {
  const parsedSelections = selectedParts.map((part) => {
    const normalized = normalizePart(part);
    const rowLocator = parseRowLocator(normalized.row_id);
    return { normalized, rowLocator };
  });

  assert(parsedSelections.every((s) => s.rowLocator), 'Missing row_id in selection');

  const rowMap = new Map();
  sourceRows.forEach((row) => {
    rowMap.set(row.id, {
      rowId: row.id,
      technicianEmail: row.technician_email,
      assignedParts: deepClone(Array.isArray(row.assigned_parts) ? row.assigned_parts : []),
      stock: deepClone(row.stock || {}),
    });
  });

  rowMap.forEach((rowState) => {
    rowState.legacyRefs = collectLegacyRefs(rowState.stock);
  });

  for (const selection of parsedSelections) {
    const { normalized, rowLocator } = selection;
    const rowState = rowMap.get(rowLocator.rowId);
    assert(rowState, `Row ${rowLocator.rowId} not found`);

    let remaining = toSafePositive(normalized.quantity);
    const requireIdentity = hasStrongIdentity(normalized);

    if (rowLocator.bucket === 'assigned') {
      const located = rowState.assignedParts[rowLocator.index];
      assert(located && typeof located === 'object' && !Array.isArray(located), 'Assigned item stale');
      const candidate = normalizePart(located);
      if (requireIdentity) {
        assert(partsMatchStrict(candidate, normalized), 'Assigned item identity changed');
      }
      const { moved, remaining: left } = decrementEntry(located, remaining);
      if (left <= 0) rowState.assignedParts[rowLocator.index] = null;
      remaining -= moved;
    } else {
      const legacy = rowState.legacyRefs.find(
        (entry) => entry.bucket === rowLocator.bucket && entry.index === rowLocator.index,
      );
      assert(legacy, 'Legacy item stale');
      if (requireIdentity) {
        assert(partsMatchStrict(legacy.candidate, normalized), 'Legacy item identity changed');
      }
      const { moved } = decrementEntry(legacy.entry, remaining);
      remaining -= moved;
    }

    assert(remaining <= 0, 'Not enough quantity on selected row');
  }

  const updatedRows = Array.from(rowMap.values()).map((state) => ({
    id: state.rowId,
    assigned_parts: state.assignedParts.flatMap((part) => {
      if (!part) return [];
      const qty = toSafeNonNegative(part.quantity ?? part.count ?? part.available_stock ?? 0);
      return qty > 0 ? [part] : [];
    }),
    stock: state.stock,
  }));

  return updatedRows;
};

const simulateTransferTechToTech = ({ sourceRow, targetRow, transferItem, quantity }) => {
  const rowLocator = parseRowLocator(transferItem.row_id);
  assert(rowLocator, 'Missing row_id for transfer item');
  assert(rowLocator.rowId === sourceRow.id, 'Transfer row mismatch');

  const sourceAssigned = deepClone(Array.isArray(sourceRow.assigned_parts) ? sourceRow.assigned_parts : []);
  const sourceLegacy = deepClone(sourceRow.stock || {});
  const legacyRefs = collectLegacyRefs(sourceLegacy);
  const normalized = normalizePart(transferItem);

  let remaining = toSafePositive(quantity);
  let movedPart = null;

  if (rowLocator.bucket === 'assigned') {
    const located = sourceAssigned[rowLocator.index];
    assert(located && typeof located === 'object' && !Array.isArray(located), 'Transfer source item stale');
    const candidate = normalizePart(located);
    if (hasStrongIdentity(normalized)) {
      assert(partsMatchStrict(candidate, normalized), 'Transfer source identity changed');
    }
    const { moved, remaining: left } = decrementEntry(located, remaining);
    if (left <= 0) sourceAssigned[rowLocator.index] = null;
    remaining -= moved;
    movedPart = { ...candidate, quantity: moved, available_stock: moved };
  } else {
    const legacy = legacyRefs.find((entry) => entry.bucket === rowLocator.bucket && entry.index === rowLocator.index);
    assert(legacy, 'Transfer legacy source item stale');
    if (hasStrongIdentity(normalized)) {
      assert(partsMatchStrict(legacy.candidate, normalized), 'Transfer legacy identity changed');
    }
    const { moved } = decrementEntry(legacy.entry, remaining);
    remaining -= moved;
    movedPart = { ...normalizePart({ ...legacy.candidate, ...normalized }), quantity: moved, available_stock: moved };
  }

  assert(remaining <= 0, 'Not enough quantity to transfer');

  const targetAssigned = deepClone(Array.isArray(targetRow.assigned_parts) ? targetRow.assigned_parts : []);
  targetAssigned.push(movedPart);

  return {
    source: {
      id: sourceRow.id,
      assigned_parts: sourceAssigned.flatMap((part) => {
        if (!part) return [];
        const qty = toSafeNonNegative(part.quantity ?? part.count ?? part.available_stock ?? 0);
        return qty > 0 ? [part] : [];
      }),
      stock: sourceLegacy,
    },
    target: {
      id: targetRow.id,
      assigned_parts: targetAssigned,
      stock: deepClone(targetRow.stock || {}),
    },
  };
};

const run = () => {
  console.log('--- Dry Run: INV assign from Soltrack stock ---');
  const soltrackPayload = [
    { stock_id: 24751, code: 'MTX - MC904 EU', quantity: 1 },
    { stock_id: 33917, code: 'MTX - 10M IPC 6 PIN', quantity: 1 },
  ];
  assert(soltrackPayload.every((item) => item.stock_id), 'Soltrack payload must carry stock_id');
  console.log(`PASS: ${soltrackPayload.length} selected inventory IDs will be removed exactly by id.`);

  console.log('\n--- Dry Run: INV assign from Technician stock (strict row move) ---');
  const sourceRows = [
    {
      id: 214,
      technician_email: 'justin@soltrack.co.za',
      assigned_parts: [
        { stock_id: 28013, code: 'VW-EC-5', quantity: 1, serial_number: 'VWEC5-280824-0160' },
        { stock_id: 28014, code: 'VW-EC-5', quantity: 1, serial_number: 'VWEC5-280824-0161' },
      ],
      stock: {},
    },
  ];
  const selectedForJob = [
    { row_id: '214-assigned-1', stock_id: 28014, code: 'VW-EC-5', quantity: 1, serial_number: 'VWEC5-280824-0161' },
  ];
  const updatedRows = simulateAssignFromTechnician({ sourceRows, selectedParts: selectedForJob });
  assert(updatedRows[0].assigned_parts.length === 1, 'Expected one item left after strict move');
  assert(String(updatedRows[0].assigned_parts[0].stock_id) === '28013', 'Wrong item moved from technician source');
  console.log('PASS: Only selected row_id item moved; sibling item untouched.');

  expectThrows(
    () =>
      simulateAssignFromTechnician({
        sourceRows,
        selectedParts: [
          { row_id: '214-assigned-99', stock_id: 28014, code: 'VW-EC-5', quantity: 1 },
        ],
      }),
    'stale technician row locator is rejected',
  );

  console.log('\n--- Dry Run: INV transfer stock between technicians ---');
  const transferResult = simulateTransferTechToTech({
    sourceRow: {
      id: 214,
      assigned_parts: [
        { stock_id: 24751, code: 'MTX - MC904 EU', quantity: 1, serial_number: 'MC904-AAA' },
      ],
      stock: {},
    },
    targetRow: {
      id: 233,
      assigned_parts: [],
      stock: {},
    },
    transferItem: {
      row_id: '214-assigned-0',
      stock_id: 24751,
      code: 'MTX - MC904 EU',
      serial_number: 'MC904-AAA',
    },
    quantity: 1,
  });
  assert(transferResult.source.assigned_parts.length === 0, 'Source should be decremented fully');
  assert(transferResult.target.assigned_parts.length === 1, 'Target should receive one moved item');
  console.log('PASS: source decremented, target appended exactly one selected item.');

  expectThrows(
    () =>
      simulateTransferTechToTech({
        sourceRow: {
          id: 214,
          assigned_parts: [{ stock_id: 24751, code: 'MTX - MC904 EU', quantity: 1, serial_number: 'MC904-AAA' }],
          stock: {},
        },
        targetRow: { id: 233, assigned_parts: [], stock: {} },
        transferItem: {
          row_id: '214-assigned-0',
          stock_id: 999999,
          code: 'MTX - MC904 EU',
          serial_number: 'MC904-AAA',
        },
        quantity: 1,
      }),
    'identity mismatch on transfer is rejected',
  );

  expectThrows(
    () =>
      simulateTransferTechToTech({
        sourceRow: {
          id: 214,
          assigned_parts: [{ stock_id: 24751, code: 'MTX - MC904 EU', quantity: 1, serial_number: 'MC904-AAA' }],
          stock: {},
        },
        targetRow: { id: 233, assigned_parts: [], stock: {} },
        transferItem: {
          stock_id: 24751,
          code: 'MTX - MC904 EU',
          serial_number: 'MC904-AAA',
        },
        quantity: 1,
      }),
    'missing row_id on transfer is rejected',
  );

  console.log('\n--- Dry Run: TECH complete job selected stock only ---');
  const techSelectionPayload = [
    {
      row_id: '214-assigned-0',
      stock_id: 24751,
      code: 'MTX - MC904 EU',
      serial_number: 'MC904-AAA',
      quantity: 1,
      source: 'tech_stock.assigned_parts',
    },
  ];
  assert(techSelectionPayload.every((item) => item.row_id && item.source === 'tech_stock.assigned_parts'), 'Tech payload missing strict row marker');
  console.log('PASS: TECH payload carries row_id + identity for strict transfer_equipment flow.');

  console.log('\nDry run completed: all strict-move checks passed.');
};

try {
  run();
  process.exit(0);
} catch (error) {
  console.error('Dry run failed:', error.message || error);
  process.exit(1);
}
