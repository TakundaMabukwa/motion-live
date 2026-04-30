import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const normalizeQuantity = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
      .select("technician_email, assigned_parts, stock")
      .ilike("technician_email", technicianEmail)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
    const mergedItems = rows.flatMap((row) => {
      const assignedParts = Array.isArray(row?.assigned_parts)
        ? row.assigned_parts
        : [];
      const legacyStockArray = Array.isArray(row?.stock) ? row.stock : [];
      const parsedStockObject = parseLegacyStockObject(row?.stock);
      return [...assignedParts, ...legacyStockArray, ...parsedStockObject];
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
