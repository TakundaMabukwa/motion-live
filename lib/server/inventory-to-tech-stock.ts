import type { SupabaseClient } from "@supabase/supabase-js";

const normalizeEmail = (value: unknown) =>
  String(value || "").trim().toLowerCase();

export type AssignInventoryToTechInput = {
  technicianEmail: string;
  inventoryItemIds: number[];
  techStockId?: number | null;
};

export async function assignInventoryItemsToTechnicianStock(
  supabase: SupabaseClient,
  input: AssignInventoryToTechInput,
) {
  const technicianEmail = normalizeEmail(input.technicianEmail);
  const inventoryItemIds = [
    ...new Set(
      (input.inventoryItemIds || []).filter(
        (id) => Number.isFinite(id) && id > 0,
      ),
    ),
  ] as number[];

  if (!technicianEmail) {
    return { ok: false as const, status: 400, error: "technician_email is required" };
  }

  if (inventoryItemIds.length === 0) {
    return { ok: false as const, status: 400, error: "No inventory items selected" };
  }

  if (input.techStockId) {
    const { data: stockRow, error: stockError } = await supabase
      .from("tech_stock")
      .select("id, technician_email")
      .eq("id", input.techStockId)
      .maybeSingle();

    if (stockError) {
      return {
        ok: false as const,
        status: 500,
        error: stockError.message || "Failed to resolve technician stock row",
      };
    }

    if (!stockRow) {
      return {
        ok: false as const,
        status: 404,
        error: "Technician stock row was not found. Refresh and try again.",
      };
    }

    if (normalizeEmail(stockRow.technician_email) !== technicianEmail) {
      return {
        ok: false as const,
        status: 409,
        error: "Selected technician does not match the technician stock row.",
      };
    }
  }

  const { data: inventoryRows, error: inventoryError } = await supabase
    .from("inventory_items")
    .select("id, serial_number, status, category_code")
    .in("id", inventoryItemIds);

  if (inventoryError) {
    return {
      ok: false as const,
      status: 500,
      error: inventoryError.message || "Failed to load inventory items",
    };
  }

  const rows = Array.isArray(inventoryRows) ? inventoryRows : [];
  if (rows.length !== inventoryItemIds.length) {
    return {
      ok: false as const,
      status: 409,
      error: "One or more selected inventory items no longer exist.",
    };
  }

  const unavailable = rows.filter(
    (row) => String(row.status || "").trim().toUpperCase() !== "IN STOCK",
  );
  if (unavailable.length > 0) {
    return {
      ok: false as const,
      status: 409,
      error: "One or more selected items are no longer IN STOCK.",
    };
  }

  const missingSerial = rows.find(
    (row) => !String(row.serial_number || "").trim(),
  );
  if (missingSerial) {
    return {
      ok: false as const,
      status: 409,
      error: `Inventory item ${missingSerial.id} is missing serial_number.`,
    };
  }

  const rpcPayload: Record<string, unknown> = {
    p_technician_email: technicianEmail,
    p_inventory_item_ids: inventoryItemIds,
    p_parts: [],
  };

  if (input.techStockId) {
    rpcPayload.p_tech_stock_id = input.techStockId;
  }

  const { data: moveResult, error: moveError } = await supabase.rpc(
    "tech_stock_assign_inventory_parts",
    rpcPayload,
  );

  if (moveError) {
    return {
      ok: false as const,
      status: 500,
      error:
        moveError.message ||
        "Failed to atomically move stock from inventory to technician",
    };
  }

  const moveSummary =
    Array.isArray(moveResult) && moveResult.length > 0 ? moveResult[0] : null;

  return {
    ok: true as const,
    data: {
      technician_email: technicianEmail,
      parts_added: inventoryItemIds.length,
      total_parts: Number(moveSummary?.total_parts || 0),
      moved_count: Number(moveSummary?.moved_count || inventoryItemIds.length),
    },
  };
}
