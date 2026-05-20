import type { SupabaseClient } from "@supabase/supabase-js";

export const normalizeTechnicianEmail = (value: unknown) =>
  String(value || "").trim().toLowerCase();

const toPartsArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

type TechStockRow = {
  id: number;
  technician_email: string | null;
  assigned_parts: unknown;
};

/**
 * Append parts to tech_stock.assigned_parts for one technician (does not overwrite).
 * Uses direct table updates so it works even when the RPC migration is not applied yet.
 */
export async function appendAssignedPartsToTechnicianStock(
  supabase: SupabaseClient,
  technicianEmail: unknown,
  partsRequired: unknown,
) {
  const email = normalizeTechnicianEmail(technicianEmail);
  const partsToAppend = toPartsArray(partsRequired);

  if (!email) {
    return { success: false as const, error: new Error("Technician email is required") };
  }

  if (partsToAppend.length === 0) {
    return { success: true as const, totalParts: 0, partsAdded: 0, assignedParts: [] };
  }

  const { data: stockRows, error: fetchError } = await supabase
    .from("tech_stock")
    .select("id, technician_email, assigned_parts")
    .ilike("technician_email", email)
    .order("id", { ascending: true });

  if (fetchError) {
    return { success: false as const, error: fetchError };
  }

  const rows = (Array.isArray(stockRows) ? stockRows : []) as TechStockRow[];

  const existingParts = rows.flatMap((row) => toPartsArray(row.assigned_parts));
  const mergedParts = [...existingParts, ...partsToAppend];
  const primaryRow = rows[0] ?? null;

  if (!primaryRow) {
    const { data: inserted, error: insertError } = await supabase
      .from("tech_stock")
      .insert({
        technician_email: email,
        assigned_parts: mergedParts,
      })
      .select("id, assigned_parts")
      .single();

    if (insertError) {
      return { success: false as const, error: insertError };
    }

    return {
      success: true as const,
      totalParts: mergedParts.length,
      partsAdded: partsToAppend.length,
      assignedParts: toPartsArray(inserted?.assigned_parts),
    };
  }

  const { error: updateError } = await supabase
    .from("tech_stock")
    .update({ assigned_parts: mergedParts })
    .eq("id", primaryRow.id);

  if (updateError) {
    return { success: false as const, error: updateError };
  }

  const duplicateIds = rows
    .slice(1)
    .map((row) => row.id)
    .filter((id) => Number.isFinite(id));

  if (duplicateIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("tech_stock")
      .delete()
      .in("id", duplicateIds);

    if (deleteError) {
      console.warn(
        "Failed to collapse duplicate tech_stock rows after append:",
        deleteError.message,
      );
    }
  }

  return {
    success: true as const,
    totalParts: mergedParts.length,
    partsAdded: partsToAppend.length,
    assignedParts: mergedParts,
  };
}
