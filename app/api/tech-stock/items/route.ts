import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const normalizeQuantity = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSearchValue = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const normalizeAssignedPart = (part: unknown) => {
  const base = part && typeof part === "object" ? { ...(part as Record<string, unknown>) } : {};
  const serialNumber = String(
    base.serial_number ?? base.serial ?? base.serialNumber ?? base.ip_address ?? "",
  ).trim();

  return {
    ...base,
    description: String(base.description ?? base.name ?? base.code ?? "Item"),
    code: String(base.code ?? base.category_code ?? ""),
    quantity: normalizeQuantity(base.quantity ?? base.count ?? 1) || 1,
    serial_number: serialNumber,
    ip_address: String(base.ip_address ?? "").trim(),
  };
};

const buildPartIdentityKey = (part: Record<string, unknown>) => {
  const stockId = normalizeSearchValue(part.stock_id ?? part.id);
  if (stockId) return `stock:${stockId}`;

  const serial = normalizeSearchValue(
    part.serial_number ?? part.serial ?? part.serialNumber ?? part.ip_address,
  );
  const code = normalizeSearchValue(part.code ?? part.category_code);
  const supplier = normalizeSearchValue(part.supplier);
  if (serial) return `serial:${serial}|code:${code}|supplier:${supplier}`;

  const description = normalizeSearchValue(
    part.description ?? part.name ?? part.item_description,
  );
  return `code:${code}|supplier:${supplier}|desc:${description}`;
};

const parseLegacyStockObject = (rawStock: unknown) => {
  if (!rawStock || typeof rawStock !== "object" || Array.isArray(rawStock)) {
    return [];
  }

  const normalizedItems: Array<Record<string, unknown>> = [];
  const stockRecord = rawStock as Record<string, unknown>;

  const pushItem = (
    supplier: string,
    code: string,
    rawItem: Record<string, unknown>,
  ) => {
    const quantity = normalizeQuantity(rawItem.count ?? rawItem.quantity ?? 0);
    if (quantity <= 0) return;

    const itemCode = String(code || "").trim();
    const safeSupplier = String(supplier || "Technician Stock").trim();
    const description =
      String(rawItem.description || rawItem.name || itemCode).trim() || itemCode;
    const itemId = `tech-${safeSupplier}-${itemCode}`;
    const serialNumber = String(
      rawItem.serial_number ?? rawItem.serial ?? rawItem.serialNumber ?? rawItem.ip_address ?? "",
    ).trim();

    normalizedItems.push({
      id: itemId,
      stock_id: itemId,
      supplier: safeSupplier,
      code: itemCode,
      description,
      stock_type: safeSupplier,
      quantity,
      available_stock: quantity,
      status: "IN STOCK",
      serial_number: serialNumber,
      ip_address: String(rawItem.ip_address || "").trim(),
      source: "tech_stock.stock",
    });
  };

  Object.entries(stockRecord).forEach(([topKey, topValue]) => {
    if (!topValue || typeof topValue !== "object" || Array.isArray(topValue)) {
      return;
    }

    const topObject = topValue as Record<string, unknown>;
    const isDirectItem =
      Object.prototype.hasOwnProperty.call(topObject, "count") ||
      Object.prototype.hasOwnProperty.call(topObject, "quantity") ||
      Object.prototype.hasOwnProperty.call(topObject, "description");

    if (isDirectItem) {
      // Supports shape: { "CODE": { count, description } }
      pushItem("Technician Stock", topKey, topObject);
      return;
    }

    // Supports nested shape: { "SUPPLIER": { "CODE": { count, description } } }
    Object.entries(topObject).forEach(([childCode, childValue]) => {
      if (!childValue || typeof childValue !== "object" || Array.isArray(childValue)) {
        return;
      }
      pushItem(topKey, childCode, childValue as Record<string, unknown>);
    });
  });

  return normalizedItems;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const technicianEmail = searchParams.get("technician_email")?.trim();

    if (!technicianEmail) {
      return NextResponse.json(
        { error: "technician_email is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("tech_stock")
      .select("id, technician_email, assigned_parts, stock")
      .ilike("technician_email", technicianEmail)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
    const mergedItems = rows.flatMap((row) => {
      const rowPrefix = String(row?.id ?? "row");
      const assignedParts = Array.isArray(row?.assigned_parts)
        ? row.assigned_parts.map((part, index) => ({
            ...normalizeAssignedPart(part),
            row_id: `${rowPrefix}-assigned-${index}`,
          }))
        : [];
      const legacyStockArray = Array.isArray(row?.stock)
        ? row.stock.map((part, index) => ({
            ...normalizeAssignedPart(part),
            row_id: `${rowPrefix}-legacy-array-${index}`,
          }))
        : [];
      const parsedStockObject = parseLegacyStockObject(row?.stock).map((part, index) => ({
        ...part,
        row_id: `${rowPrefix}-legacy-object-${index}`,
      }));
      const legacyItems = [...legacyStockArray, ...parsedStockObject].map((part) =>
        normalizeAssignedPart(part),
      );

      if (assignedParts.length === 0) {
        return legacyItems.map((part, index) => ({
          ...part,
          row_id:
            String((part as Record<string, unknown>)?.row_id || "").trim() ||
            `${rowPrefix}-item-${index}`,
        }));
      }

      const merged = [...assignedParts];
      const seen = new Set(
        assignedParts.map((part) =>
          buildPartIdentityKey(part as Record<string, unknown>),
        ),
      );

      legacyItems.forEach((legacyPart) => {
        const key = buildPartIdentityKey(legacyPart as Record<string, unknown>);
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(legacyPart);
      });

      return merged.map((part, index) => ({
        ...part,
        row_id:
          String((part as Record<string, unknown>)?.row_id || "").trim() ||
          `${rowPrefix}-item-${index}`,
      }));
    });

    return NextResponse.json({
      technician_email: rows[0]?.technician_email || technicianEmail,
      items: mergedItems,
    });
  } catch (error) {
    console.error("Error in tech stock items GET:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
