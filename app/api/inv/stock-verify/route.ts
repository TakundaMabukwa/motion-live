import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const normalizeForMatch = (val: unknown) =>
  String(val || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]/g, "");

const normalizeIP = (val: unknown) => {
  let raw = String(val || "").trim().toLowerCase();
  if (!raw) return "";
  raw = raw.replace(/[\s\-_]/g, "");
  const colonIdx = raw.indexOf(":");
  if (colonIdx > 0) raw = raw.substring(0, colonIdx);
  const slashIdx = raw.indexOf("/");
  if (slashIdx > 0) raw = raw.substring(0, slashIdx);
  return raw;
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

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const bucket = String(searchParams.get("bucket") || "").trim();
    const serialNumber = String(searchParams.get("serial_number") || "").trim();
    const technicianEmail = String(searchParams.get("technician_email") || "").trim();

    if (!bucket || !serialNumber) {
      return NextResponse.json({ error: "bucket and serial_number required" }, { status: 400 });
    }

    const normalized = normalizeForMatch(serialNumber);

    if (bucket === "soltrack") {
      const { data: items, error } = await serviceSupabase
        .from("inventory_items")
        .select("id, category_code, serial_number, status, company, container, direction, assigned_to_technician, job_card_id, notes")
        .range(0, 9999);
      if (error) throw error;

      const match = (items || []).find((item) => normalizeForMatch(item.serial_number) === normalized);
      if (match) {
        return NextResponse.json({ found: true, item: match });
      }
      return NextResponse.json({ found: false, item: null });
    }

    if (bucket === "client") {
      const { data: items, error } = await serviceSupabase
        .from("client_inventory_items")
        .select("id, client_code, cost_code, category_code, serial_number, status, company, container, direction, assigned_to_technician, job_card_id, notes")
        .range(0, 9999);
      if (error) throw error;

      const match = (items || []).find((item) => normalizeForMatch(item.serial_number) === normalized);
      if (match) {
        return NextResponse.json({ found: true, item: match });
      }
      return NextResponse.json({ found: false, item: null });
    }

    if (bucket === "technician") {
      const query = serviceSupabase
        .from("tech_stock")
        .select("id, technician_email, name, assigned_parts")
        .not("assigned_parts", "is", null);

      if (technicianEmail) {
        query.eq("technician_email", technicianEmail);
      }

      const { data: techRows, error } = await query.range(0, 9999);
      if (error) throw error;

      for (const row of techRows || []) {
        const parts = Array.isArray(row.assigned_parts) ? row.assigned_parts : [];
        for (const part of parts) {
          if (part && normalizeForMatch(part.serial_number) === normalized) {
            return NextResponse.json({
              found: true,
              item: {
                id: row.id,
                serial_number: part.serial_number,
                category_code: part.code || "",
                status: "ASSIGNED",
                company: null,
                container: null,
                direction: null,
                assigned_to_technician: row.technician_email || null,
                job_card_id: null,
                notes: null,
                technician_email: row.technician_email || "",
                technician_name: row.name || "",
                code: part.code || "",
                description: part.description || "",
              },
            });
          }
        }
      }

      return NextResponse.json({ found: false, item: null });
    }

    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  } catch (error) {
    console.error("Error in stock verify GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { bucket, stock_id, serial_number, technician_email } = body;

    if (!bucket || !serial_number) {
      return NextResponse.json({ error: "bucket and serial_number required" }, { status: 400 });
    }

    if (bucket === "soltrack") {
      if (!stock_id) {
        return NextResponse.json({ error: "stock_id required for soltrack" }, { status: 400 });
      }
      const { error } = await serviceSupabase
        .from("inventory_items")
        .delete()
        .eq("id", stock_id);
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Deleted from Soltrack stock" });
    }

    if (bucket === "client") {
      if (!stock_id) {
        return NextResponse.json({ error: "stock_id required for client" }, { status: 400 });
      }
      const { error } = await serviceSupabase
        .from("client_inventory_items")
        .delete()
        .eq("id", stock_id);
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Deleted from Client stock" });
    }

    if (bucket === "technician") {
      if (!technician_email || !serial_number) {
        return NextResponse.json({ error: "technician_email and serial_number required" }, { status: 400 });
      }
      const { data: techRow, error: fetchError } = await serviceSupabase
        .from("tech_stock")
        .select("id, assigned_parts")
        .eq("technician_email", technician_email)
        .single();
      if (fetchError || !techRow) {
        return NextResponse.json({ error: "Technician stock not found" }, { status: 404 });
      }

      const parts = Array.isArray(techRow.assigned_parts) ? techRow.assigned_parts : [];
      const normalizedTarget = normalizeForMatch(serial_number);
      const filteredParts = parts.filter((p: Record<string, unknown>) => {
        const pSn = normalizeForMatch(p.serial_number);
        return pSn !== normalizedTarget;
      });

      if (filteredParts.length === parts.length) {
        return NextResponse.json({ error: "Item not found in technician stock" }, { status: 404 });
      }

      const { error: updateError } = await serviceSupabase
        .from("tech_stock")
        .update({ assigned_parts: filteredParts })
        .eq("id", techRow.id);
      if (updateError) throw updateError;
      return NextResponse.json({ success: true, message: "Removed from Technician stock" });
    }

    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  } catch (error) {
    console.error("Error in stock verify DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
