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

const isValidSingleTechnicianEmail = (value: unknown) => {
  const email = normalizeSearchValue(value);
  if (!email) return false;
  if (email.includes(",") || email.includes(" ")) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const [localPart] = email.split("@");
  if (!localPart) return false;
  return !localPart.includes(".");
};

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
    if (!isValidSingleTechnicianEmail(technicianEmail)) {
      return NextResponse.json(
        { error: "technician_email must be a single valid email address" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("tech_stock")
      // Source of truth is tech_stock.assigned_parts going forward.
      .select("id, technician_email, assigned_parts")
      .ilike("technician_email", technicianEmail)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
    const expandedItems = rows.flatMap((row) => {
      const parts = Array.isArray(row?.assigned_parts)
        ? row.assigned_parts
        : [];

      const expanded: Record<string, unknown>[] = [];
      let globalIndex = 0;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const base = part && typeof part === "object" ? { ...(part as Record<string, unknown>) } : {};
        const serialNumber = String(
          base.serial_number ?? base.serial ?? base.serialNumber ?? base.ip_address ?? "",
        ).trim();
        const quantity = normalizeQuantity(base.quantity ?? base.count ?? 1) || 1;

        const normalized = {
          ...base,
          description: String(base.description ?? base.name ?? base.code ?? "Item"),
          code: String(base.code ?? base.category_code ?? ""),
          quantity,
          serial_number: serialNumber,
          ip_address: String(base.ip_address ?? "").trim(),
        };

        if (quantity <= 1) {
          expanded.push({
            ...normalized,
            quantity: 1,
            available_stock: normalizeQuantity(base.available_stock ?? 1) || 1,
          });
          globalIndex++;
        } else {
          for (let unitIndex = 0; unitIndex < quantity; unitIndex++) {
            expanded.push({
              ...normalized,
              quantity: 1,
              available_stock: 1,
              unit_index: unitIndex + 1,
              unit_total: quantity,
            });
            globalIndex++;
          }
        }
      }

      return expanded;
    });

    return NextResponse.json({
      technician_email: rows[0]?.technician_email || technicianEmail,
      items: expandedItems,
    });
  } catch (error) {
    console.error("Error in tech stock items GET:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
