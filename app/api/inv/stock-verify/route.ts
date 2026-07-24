import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const BATCH = 1000;

const SERIAL_NUMBER_COLUMNS = [
  "skylink_trailer_unit_serial_number",
  "sky_on_batt_ign_unit_serial_number",
  "skylink_voice_kit_serial_number",
  "sky_scout_12v_serial_number",
  "sky_scout_24v_serial_number",
  "skylink_pro_serial_number",
  "skylink_sim_card_no",
  "skylink_data_number",
  "sim_card_number",
  "data_number",
  "corpconnect_sim_no",
  "corpconnect_data_no",
  "pfk_corpconnect_sim_number",
  "pfk_corpconnect_data_number",
  "mtx_corpconnect_sim_number",
  "mtx_corpconnect_data_number",
  "sim_id",
  "mtx_sim_id",
];

const IP_COLUMNS = [
  "skylink_trailer_unit_ip",
  "sky_on_batt_ign_unit_ip",
  "skylink_voice_kit_ip",
  "sky_scout_12v_ip",
  "sky_scout_24v_ip",
  "skylink_pro_ip",
  "vw100ip_driver_facing_ip",
];

const ALL_COLUMNS_TO_CHECK = [...SERIAL_NUMBER_COLUMNS, ...IP_COLUMNS];

async function fetchAllRows(
  client: ReturnType<typeof createServiceClient>,
  table: string,
  columns: string,
  filters?: { column: string; operator: string; value: unknown }[]
) {
  let query = client.from(table).select(columns);
  if (filters) {
    for (const f of filters) {
      if (f.operator === "not.is") query = query.not(f.column, "is", f.value);
    }
  }
  let from = 0;
  const allRows: Record<string, unknown>[] = [];
  while (true) {
    const { data: batch, error } = await query.range(from, from + BATCH - 1);
    if (error) break;
    const rows = (batch || []) as Record<string, unknown>[];
    allRows.push(...rows);
    if (rows.length < BATCH) break;
    from += BATCH;
  }
  return allRows;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const serialNumber = String(searchParams.get("serial_number") || "").trim();
    const bucket = String(searchParams.get("bucket") || "").trim();

    if (!serialNumber || !bucket) {
      return NextResponse.json({ error: "serial_number and bucket required" }, { status: 400 });
    }

    if (bucket === "soltrack") {
      const { data: item, error } = await serviceSupabase
        .from("inventory_items")
        .select("id, category_code, serial_number, status, company, container, direction, assigned_to_technician, job_card_id, notes")
        .eq("serial_number", serialNumber)
        .single();
      if (error || !item) return NextResponse.json({ found: false, item: null });
      return NextResponse.json({ found: true, item });
    }

    if (bucket === "client") {
      const { data: item, error } = await serviceSupabase
        .from("client_inventory_items")
        .select("id, client_code, cost_code, category_code, serial_number, status, company, container, direction, assigned_to_technician, job_card_id, notes")
        .eq("serial_number", serialNumber)
        .single();
      if (error || !item) return NextResponse.json({ found: false, item: null });
      return NextResponse.json({ found: true, item });
    }

    if (bucket === "technician") {
      const { data: techRows, error } = await serviceSupabase
        .from("tech_stock")
        .select("id, technician_email, name, assigned_parts")
        .not("assigned_parts", "is", null)
        .range(0, 9999);
      if (error) throw error;

      for (const row of techRows || []) {
        const parts = Array.isArray(row.assigned_parts) ? row.assigned_parts : [];
        for (const part of parts) {
          if (part && String(part.serial_number || "").trim() === serialNumber) {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { bucket, serial_number, stock_id, technician_email } = body;

    if (!bucket || !serial_number) {
      return NextResponse.json({ error: "bucket and serial_number required" }, { status: 400 });
    }

    if (bucket === "soltrack") {
      const { error } = await serviceSupabase
        .from("inventory_items")
        .delete()
        .eq("serial_number", serial_number);
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Deleted from Soltrack stock" });
    }

    if (bucket === "client") {
      const { error } = await serviceSupabase
        .from("client_inventory_items")
        .delete()
        .eq("serial_number", serial_number);
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Deleted from Client stock" });
    }

    if (bucket === "technician") {
      if (!technician_email) {
        return NextResponse.json({ error: "technician_email required" }, { status: 400 });
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
      const filteredParts = parts.filter((p: Record<string, unknown>) =>
        String(p.serial_number || "").trim() !== serial_number
      );

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
