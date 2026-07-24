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
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      break;
    }
    const rows = (batch || []) as Record<string, unknown>[];
    allRows.push(...rows);
    if (rows.length < BATCH) break;
    from += BATCH;
  }
  return allRows;
}

interface StockItem {
  id: number;
  serial_number: string;
  category_code: string;
  status: string;
  company: string | null;
  container: string | null;
  direction: string | null;
  assigned_to_technician: string | null;
  job_card_id: string | null;
  notes: string | null;
  client_code?: string;
  cost_code?: string;
  technician_email?: string;
  technician_name?: string;
  code?: string;
  description?: string;
}

interface VehicleMatch {
  vehicle_id: number;
  vehicle_reg: string | null;
  vehicle_fleet: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_account: string | null;
  vehicle_company: string | null;
  column_name: string;
  serial_number: string;
  bucket: "soltrack" | "client" | "technician";
  stock_item: StockItem;
}

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
    const search = String(searchParams.get("search") || "").trim().toLowerCase();

    const vehicles = await fetchAllRows(
      serviceSupabase,
      "vehicles_duplicate",
      `id, reg, fleet_number, make, model, new_account_number, company, ${ALL_COLUMNS_TO_CHECK.join(", ")}`
    );

    const allSerials = new Set<string>();
    for (const v of vehicles) {
      for (const col of ALL_COLUMNS_TO_CHECK) {
        const rawVal = v[col];
        if (!rawVal) continue;
        const serialVal = String(rawVal).trim();
        if (serialVal) allSerials.add(serialVal);
      }
    }

    const serialArray = Array.from(allSerials);

    const soltrackItems = await fetchAllRows(
      serviceSupabase,
      "inventory_items",
      "id, category_code, serial_number, status, assigned_to_technician, company, notes, container, direction, job_card_id"
    );

    const clientItems = await fetchAllRows(
      serviceSupabase,
      "client_inventory_items",
      "id, client_code, cost_code, category_code, serial_number, status, assigned_to_technician, company, notes, container, direction, job_card_id"
    );

    const soltrackBySerial = new Map<string, StockItem>();
    for (const item of soltrackItems) {
      const sn = String(item.serial_number || "").trim();
      if (sn) soltrackBySerial.set(sn, item as unknown as StockItem);
    }

    const clientBySerial = new Map<string, StockItem>();
    for (const item of clientItems) {
      const sn = String(item.serial_number || "").trim();
      if (sn) clientBySerial.set(sn, item as unknown as StockItem);
    }

    const techStockRows = await fetchAllRows(
      serviceSupabase,
      "tech_stock",
      "id, technician_email, name, assigned_parts",
      [{ column: "assigned_parts", operator: "not.is", value: null }]
    );

    const techBySerial = new Map<string, StockItem & { _techRowId?: number }>();
    const serialSet = new Set(serialArray);
    for (const row of techStockRows) {
      const parts = Array.isArray(row.assigned_parts) ? row.assigned_parts : [];
      for (const part of parts) {
        if (part && part.serial_number) {
          const sn = String(part.serial_number).trim();
          if (sn && serialSet.has(sn)) {
            techBySerial.set(sn, {
              id: row.id as number,
              serial_number: sn,
              category_code: (part.code as string) || "",
              status: "ASSIGNED",
              company: null,
              container: null,
              direction: null,
              assigned_to_technician: (row.technician_email as string) || null,
              job_card_id: null,
              notes: null,
              technician_email: (row.technician_email as string) || "",
              technician_name: (row.name as string) || "",
              code: (part.code as string) || "",
              description: (part.description as string) || "",
            });
          }
        }
      }
    }

    const vehicleMatches: VehicleMatch[] = [];

    for (const v of vehicles) {
      const vehicleReg = (v.reg as string) || null;
      const vehicleFleet = (v.fleet_number as string) || null;
      const vehicleMake = (v.make as string) || null;
      const vehicleModel = (v.model as string) || null;
      const vehicleAccount = (v.new_account_number as string) || null;
      const vehicleCompany = (v.company as string) || null;

      for (const col of ALL_COLUMNS_TO_CHECK) {
        const rawVal = v[col];
        if (!rawVal) continue;

        const serialVal = String(rawVal).trim();
        if (!serialVal) continue;

        let match: StockItem | undefined;
        let bucket: "soltrack" | "client" | "technician" = "soltrack";

        match = soltrackBySerial.get(serialVal);
        if (match) {
          bucket = "soltrack";
        } else {
          match = clientBySerial.get(serialVal);
          if (match) {
            bucket = "client";
          } else {
            match = techBySerial.get(serialVal);
            if (match) {
              bucket = "technician";
            }
          }
        }

        if (match) {
          vehicleMatches.push({
            vehicle_id: v.id as number,
            vehicle_reg: vehicleReg,
            vehicle_fleet: vehicleFleet,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_account: vehicleAccount,
            vehicle_company: vehicleCompany,
            column_name: col,
            serial_number: serialVal,
            bucket,
            stock_item: match,
          });
        }
      }
    }

    const filteredMatches = search
      ? vehicleMatches.filter((m) => {
          const haystack = [
            m.vehicle_reg,
            m.vehicle_fleet,
            m.vehicle_make,
            m.vehicle_model,
            m.vehicle_account,
            m.vehicle_company,
            m.serial_number,
            m.column_name,
            m.stock_item.category_code,
            m.stock_item.description || "",
            m.stock_item.code || "",
            m.stock_item.client_code || "",
            m.stock_item.technician_email || "",
          ].join(" ").toLowerCase();
          return haystack.includes(search);
        })
      : vehicleMatches;

    const bucketBreakdown = {
      soltrack: filteredMatches.filter((m) => m.bucket === "soltrack").length,
      client: filteredMatches.filter((m) => m.bucket === "client").length,
      technician: filteredMatches.filter((m) => m.bucket === "technician").length,
    };

    return NextResponse.json({
      soltrackCount: soltrackItems.length,
      clientCount: clientItems.length,
      techCount: techBySerial.size,
      vehicleMatchCount: filteredMatches.length,
      bucketBreakdown,
      vehicleMatches: filteredMatches,
    });
  } catch (error) {
    console.error("Error in stock verification GET:", error);
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
    const { bucket, serial_number, technician_email } = body;

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
