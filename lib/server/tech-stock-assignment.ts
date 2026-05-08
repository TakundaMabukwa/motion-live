import type { SupabaseClient } from "@supabase/supabase-js";

export const normalizeTechnicianEmail = (value: unknown) =>
  String(value || "").trim().toLowerCase();

const toArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

export async function appendAssignedPartsToTechnicianStock(
  supabase: SupabaseClient,
  technicianEmail: unknown,
  partsRequired: unknown,
) {
  const email = normalizeTechnicianEmail(technicianEmail);
  const parts = toArray(partsRequired);

  if (!email) {
    return { success: false, error: new Error("Technician email is required") };
  }

  if (parts.length === 0) {
    return { success: true, totalParts: 0, partsAdded: 0 };
  }

  const { data, error } = await supabase.rpc("tech_stock_append_assigned_parts", {
    p_technician_email: email,
    p_parts: parts,
  });

  if (error) {
    return { success: false, error };
  }

  const assignedParts = Array.isArray(data) ? data : [];

  return {
    success: true,
    totalParts: assignedParts.length,
    partsAdded: parts.length,
    assignedParts,
  };
}
