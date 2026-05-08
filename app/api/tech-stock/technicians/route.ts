import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TechStockRow = {
  id: number;
  technician_email: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  email: string | null;
  role?: string | null;
  tech_admin?: boolean | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
};

type TechnicianRow = {
  id: string | number;
  email: string | null;
  name: string | null;
};

const normalizeEmail = (value: unknown) =>
  String(value || "").trim().toLowerCase();

const isCleanInventoryTechnicianEmail = (value: unknown) => {
  const email = normalizeEmail(value);
  if (!email || !email.includes("@")) return false;
  const [localPart] = email.split("@");
  if (!localPart) return false;
  return !localPart.includes(".");
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      { data: stockRows, error: stockError },
      { data: userRows, error: userError },
      { data: technicianRows, error: technicianError },
    ] = await Promise.all([
      supabase
        .from("tech_stock")
        .select("id, technician_email, created_at")
        .not("technician_email", "is", null),
      supabase.from("users").select("id, email, role, tech_admin, name, first_name, last_name, full_name"),
      supabase.from("technicians").select("id, email, name"),
    ]);

    if (stockError) {
      return NextResponse.json({ error: stockError.message }, { status: 500 });
    }

    if (userError) {
      console.warn("users query warning in tech-stock technicians:", userError.message);
    }

    if (technicianError) {
      console.warn(
        "technicians query warning in tech-stock technicians:",
        technicianError.message,
      );
    }

    const technicianMap = new Map<
      string,
      {
        id: string | number;
        technician_email: string | null;
        created_at: string | null;
        display_name: string | null;
      }
    >();

    // Source-of-truth list: only technicians that exist in tech_stock.
    (stockRows as TechStockRow[] | null)?.forEach((row) => {
      const email = normalizeEmail(row.technician_email);
      if (!isCleanInventoryTechnicianEmail(email)) return;
      if (!email) return;

      const existing = technicianMap.get(email);
      if (!existing) {
        technicianMap.set(email, {
          id: row.id,
          technician_email: email,
          created_at: row.created_at || null,
          display_name: null,
        });
        return;
      }

      technicianMap.set(email, {
        ...existing,
        created_at: row.created_at || existing.created_at,
      });
    });

    // Enrich only the stock-backed emails with names from technicians/users.
    (technicianRows as TechnicianRow[] | null)?.forEach((row) => {
      const email = normalizeEmail(row.email);
      if (!isCleanInventoryTechnicianEmail(email)) return;
      if (!email || !technicianMap.has(email)) return;

      const existing = technicianMap.get(email);
      const displayName = String(row.name || "").trim() || null;
      if (!existing) return;

      technicianMap.set(email, {
        ...existing,
        id: existing.id || row.id,
        display_name: displayName || existing.display_name || null,
      });
    });

    (userRows as UserRow[] | null)?.forEach((row) => {
      const email = normalizeEmail(row.email);
      if (!isCleanInventoryTechnicianEmail(email)) return;
      if (!email || !technicianMap.has(email)) return;

      const existing = technicianMap.get(email);
      if (!existing) return;

      const displayName = [
        String(row.first_name || "").trim(),
        String(row.last_name || "").trim(),
      ]
        .filter(Boolean)
        .join(" ")
        || String(row.name || row.full_name || "").trim()
        || null;

      technicianMap.set(email, {
        ...existing,
        id: existing.id || row.id,
        display_name: existing.display_name || displayName,
      });
    });

    const technicians = Array.from(technicianMap.values()).sort((a, b) => {
      const left = String(a.display_name || a.technician_email || "").toLowerCase();
      const right = String(b.display_name || b.technician_email || "").toLowerCase();
      if (left !== right) return left.localeCompare(right);
      return String(a.technician_email || "").localeCompare(
        String(b.technician_email || ""),
      );
    });

    return NextResponse.json({ technicians });
  } catch (error) {
    console.error("Error in tech stock technicians GET:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
