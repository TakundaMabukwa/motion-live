export const normalizeEmail = (value: unknown) =>
  String(value || "").trim().toLowerCase();

/** Single technician email without dots in the local part (e.g. andre@soltrack.co.za). */
export const isCleanTechnicianEmail = (value: unknown) => {
  const email = normalizeEmail(value);
  if (!email || email.includes(",") || email.includes(" ")) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const [localPart] = email.split("@");
  if (!localPart) return false;
  return !localPart.includes(".");
};

export const isValidTechnicianEmail = isCleanTechnicianEmail;

/** Serial is required for technician stock moves; stock_id is fallback identity only. */
export const resolvePartSerial = (part: Record<string, unknown>) =>
  String(
    part.serial_number ?? part.serial ?? part.serialNumber ?? "",
  ).trim();

export const resolvePartStockId = (part: Record<string, unknown>) =>
  String(part.stock_id ?? part.inventory_item_id ?? part.id ?? "").trim();

export type AssignedPartRowLocator = {
  rowId: number;
  index: number;
  unitIndex: number | null;
};

export const parseAssignedPartRowId = (
  value: unknown,
): AssignedPartRowLocator | null => {
  const normalized = String(value || "").trim().toLowerCase();
  const match = normalized.match(/^(\d+)-assigned-(\d+)(?:-unit-(\d+))?$/);
  if (!match) return null;

  const rowId = Number.parseInt(match[1] || "", 10);
  const index = Number.parseInt(match[2] || "", 10);
  if (!Number.isFinite(rowId) || rowId <= 0) return null;
  if (!Number.isFinite(index) || index < 0) return null;

  const unitRaw = match[3];
  const unitIndex =
    unitRaw !== undefined ? Number.parseInt(unitRaw, 10) : null;

  return {
    rowId,
    index,
    unitIndex: Number.isFinite(unitIndex) ? unitIndex : null,
  };
};

export const partsMatchSelected = (
  stored: Record<string, unknown>,
  selected: Record<string, unknown>,
) => {
  const storedSerial = resolvePartSerial(stored).toLowerCase();
  const selectedSerial = resolvePartSerial(selected).toLowerCase();

  if (storedSerial && selectedSerial) {
    return storedSerial === selectedSerial;
  }

  const storedStockId = resolvePartStockId(stored).toLowerCase();
  const selectedStockId = resolvePartStockId(selected).toLowerCase();
  if (storedStockId && selectedStockId) {
    return storedStockId === selectedStockId;
  }

  return false;
};

export const getPartQuantity = (part: Record<string, unknown>) => {
  const parsed = Number(part.quantity ?? part.count ?? part.available_stock ?? 1);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
};

export const buildTransferPart = (source: Record<string, unknown>) => ({
  ...source,
  quantity: 1,
  available_stock: 1,
  serial_number: resolvePartSerial(source),
  stock_id: resolvePartStockId(source) || undefined,
  transferred_at: new Date().toISOString(),
});
