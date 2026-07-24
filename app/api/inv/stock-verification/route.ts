import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const BATCH = 1000;

const normalizeSerial = (val: unknown) =>
  String(val || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.]/g, "");

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

async function fetchAllRows(
  client: ReturnType<typeof createServiceClient>,
  table: string,
  columns: string,
  filters?: { column: string; operator: string; value: unknown }[],
  orderColumn?: string
) {
  let query = client.from(table).select(columns);
  if (filters) {
    for (const f of filters) {
      if (f.operator === "not.is") query = query.not(f.column, "is", f.value);
      else if (f.operator === "eq") query = query.eq(f.column, f.value);
    }
  }
  if (orderColumn) query = query.order(orderColumn, { ascending: false });

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

    // 1. Fetch ALL Soltrack stock (inventory_items) — batched
    const soltrackItems = await fetchAllRows(
      serviceSupabase,
      "inventory_items",
      "id, category_code, serial_number, status, assigned_to_technician, company, notes, container, direction, job_card_id",
      undefined,
      "id"
    );

    // 2. Fetch ALL Client stock (client_inventory_items) — batched
    const clientItems = await fetchAllRows(
      serviceSupabase,
      "client_inventory_items",
      "id, client_code, cost_code, category_code, serial_number, status, assigned_to_technician, company, notes, container, direction, job_card_id",
      undefined,
      "id"
    );

    // 3. Fetch ALL Technician stock (tech_stock.assigned_parts) — batched
    const techStockRows = await fetchAllRows(
      serviceSupabase,
      "tech_stock",
      "id, technician_email, name, assigned_parts",
      [{ column: "assigned_parts", operator: "not.is", value: null }],
      "id"
    );

    const techItems: Array<{
      id: number;
      technician_email: string;
      technician_name: string;
      code: string;
      description: string;
      serial_number: string;
      stock_id: number;
      quantity: number;
      supplier: string;
      cost_per_unit: number;
      total_cost: number;
    }> = [];

    for (const row of techStockRows) {
      const parts = Array.isArray(row.assigned_parts) ? row.assigned_parts : [];
      for (const part of parts) {
        if (part && part.serial_number) {
          techItems.push({
            id: row.id as number,
            technician_email: (row.technician_email as string) || "",
            technician_name: (row.name as string) || "",
            code: (part.code as string) || "",
            description: (part.description as string) || "",
            serial_number: String(part.serial_number).trim(),
            stock_id: (part.stock_id as number) || 0,
            quantity: (part.quantity as number) || 1,
            supplier: (part.supplier as string) || "",
            cost_per_unit: (part.cost_per_unit as number) || 0,
            total_cost: (part.total_cost as number) || 0,
          });
        }
      }
    }

    // 4. Fetch ALL vehicles_duplicate — batched
    const vehicles = await fetchAllRows(
      serviceSupabase,
      "vehicles_duplicate",
      "*"
    );

    // Log vehicle columns for debugging
    if (vehicles.length > 0) {
      console.log(`[Stock Verification] Vehicle columns:`, Object.keys(vehicles[0]).join(", "));
      console.log(`[Stock Verification] First vehicle sample:`, JSON.stringify({
        id: vehicles[0].id,
        reg: vehicles[0].reg,
        fleet_number: vehicles[0].fleet_number,
        skylink_pro_serial_number: vehicles[0].skylink_pro_serial_number,
        skylink_pro_ip: vehicles[0].skylink_pro_ip,
        skylink_trailer_unit_serial_number: vehicles[0].skylink_trailer_unit_serial_number,
        new_account_number: vehicles[0].new_account_number,
      }, null, 2));
    }

    console.log(`[Stock Verification] Fetched: soltrack=${soltrackItems.length}, client=${clientItems.length}, tech=${techItems.length}, vehicles=${vehicles.length}`);

    // Log sample serial numbers for debugging
    if (soltrackItems.length > 0) {
      console.log(`[Stock Verification] Sample soltrack serials:`, soltrackItems.slice(0, 3).map(i => String(i.serial_number || "").trim()));
    }
    if (clientItems.length > 0) {
      console.log(`[Stock Verification] Sample client serials:`, clientItems.slice(0, 3).map(i => String(i.serial_number || "").trim()));
    }
    if (techItems.length > 0) {
      console.log(`[Stock Verification] Sample tech serials:`, techItems.slice(0, 3).map(i => i.serial_number));
    }
    if (vehicles.length > 0) {
      const sampleVehicle = vehicles[0];
      const sampleSerials = SERIAL_NUMBER_COLUMNS
        .filter(col => sampleVehicle[col])
        .map(col => `${col}=${sampleVehicle[col]}`);
      const sampleIps = IP_COLUMNS
        .filter(col => sampleVehicle[col])
        .map(col => `${col}=${sampleVehicle[col]}`);
      console.log(`[Stock Verification] Sample vehicle serials:`, sampleSerials);
      console.log(`[Stock Verification] Sample vehicle IPs:`, sampleIps);
      console.log(`[Stock Verification] Sample vehicle reg:`, sampleVehicle.reg);
    }

    // 5. Build serial number lookup maps for each bucket
    const soltrackBySerial = new Map<string, Record<string, unknown>>();
    for (const item of soltrackItems) {
      const sn = normalizeSerial(item.serial_number);
      if (sn) soltrackBySerial.set(sn, item);
    }

    const clientBySerial = new Map<string, Record<string, unknown>>();
    for (const item of clientItems) {
      const sn = normalizeSerial(item.serial_number);
      if (sn) clientBySerial.set(sn, item);
    }

    const techBySerial = new Map<string, Record<string, unknown>>();
    for (const item of techItems) {
      const sn = normalizeSerial(item.serial_number);
      if (sn) techBySerial.set(sn, item as unknown as Record<string, unknown>);
    }

    console.log(`[Stock Verification] Lookup maps: soltrack=${soltrackBySerial.size}, client=${clientBySerial.size}, tech=${techBySerial.size}`);

    // 6. Cross-reference vehicles_duplicate serial numbers against stock buckets
    const vehicleMatches: Array<{
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
      stock_item: Record<string, unknown>;
    }> = [];

    for (const v of vehicles) {
      const vehicleReg = (v.reg as string) || null;
      const vehicleFleet = (v.fleet_number as string) || null;
      const vehicleMake = (v.make as string) || null;
      const vehicleModel = (v.model as string) || null;
      const vehicleAccount = (v.new_account_number as string) || null;
      const vehicleCompany = (v.company as string) || null;

      // Check serial number columns
      for (const col of SERIAL_NUMBER_COLUMNS) {
        const rawVal = normalizeSerial(v[col]);
        if (!rawVal) continue;

        const soltrackMatch = soltrackBySerial.get(rawVal);
        if (soltrackMatch) {
          vehicleMatches.push({
            vehicle_id: v.id as number,
            vehicle_reg: vehicleReg,
            vehicle_fleet: vehicleFleet,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_account: vehicleAccount,
            vehicle_company: vehicleCompany,
            column_name: col,
            serial_number: v[col] as string,
            bucket: "soltrack",
            stock_item: soltrackMatch,
          });
          continue;
        }

        const clientMatch = clientBySerial.get(rawVal);
        if (clientMatch) {
          vehicleMatches.push({
            vehicle_id: v.id as number,
            vehicle_reg: vehicleReg,
            vehicle_fleet: vehicleFleet,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_account: vehicleAccount,
            vehicle_company: vehicleCompany,
            column_name: col,
            serial_number: v[col] as string,
            bucket: "client",
            stock_item: clientMatch,
          });
          continue;
        }

        const techMatch = techBySerial.get(rawVal);
        if (techMatch) {
          vehicleMatches.push({
            vehicle_id: v.id as number,
            vehicle_reg: vehicleReg,
            vehicle_fleet: vehicleFleet,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_account: vehicleAccount,
            vehicle_company: vehicleCompany,
            column_name: col,
            serial_number: v[col] as string,
            bucket: "technician",
            stock_item: techMatch,
          });
        }
      }

      // Check IP columns
      for (const col of IP_COLUMNS) {
        const rawVal = normalizeSerial(v[col]);
        if (!rawVal) continue;

        const soltrackMatch = soltrackBySerial.get(rawVal);
        if (soltrackMatch) {
          vehicleMatches.push({
            vehicle_id: v.id as number,
            vehicle_reg: vehicleReg,
            vehicle_fleet: vehicleFleet,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_account: vehicleAccount,
            vehicle_company: vehicleCompany,
            column_name: col,
            serial_number: v[col] as string,
            bucket: "soltrack",
            stock_item: soltrackMatch,
          });
          continue;
        }

        const clientMatch = clientBySerial.get(rawVal);
        if (clientMatch) {
          vehicleMatches.push({
            vehicle_id: v.id as number,
            vehicle_reg: vehicleReg,
            vehicle_fleet: vehicleFleet,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_account: vehicleAccount,
            vehicle_company: vehicleCompany,
            column_name: col,
            serial_number: v[col] as string,
            bucket: "client",
            stock_item: clientMatch,
          });
          continue;
        }

        const techMatch = techBySerial.get(rawVal);
        if (techMatch) {
          vehicleMatches.push({
            vehicle_id: v.id as number,
            vehicle_reg: vehicleReg,
            vehicle_fleet: vehicleFleet,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_account: vehicleAccount,
            vehicle_company: vehicleCompany,
            column_name: col,
            serial_number: v[col] as string,
            bucket: "technician",
            stock_item: techMatch,
          });
        }
      }
    }

    console.log(`[Stock Verification] Total vehicle matches: ${vehicleMatches.length}`);

    // Log first few matches for debugging
    if (vehicleMatches.length > 0) {
      console.log(`[Stock Verification] First match:`, JSON.stringify(vehicleMatches[0], null, 2));
    }

    // Debug: check if any vehicle serial matches anything in stock maps
    if (vehicles.length > 0 && vehicleMatches.length === 0) {
      const testVehicle = vehicles[0];
      console.log(`[Stock Verification] Debugging first vehicle (id=${testVehicle.id}, reg=${testVehicle.reg}):`);
      for (const col of [...SERIAL_NUMBER_COLUMNS, ...IP_COLUMNS]) {
        const rawVal = normalizeSerial(testVehicle[col]);
        if (!rawVal) continue;
        const inSoltrack = soltrackBySerial.has(rawVal);
        const inClient = clientBySerial.has(rawVal);
        const inTech = techBySerial.has(rawVal);
        console.log(`[Stock Verification]   ${col}="${testVehicle[col]}" -> normalized="${rawVal}" -> soltrack=${inSoltrack}, client=${inClient}, tech=${inTech}`);
      }
      // Also log all stock keys for comparison
      const soltrackKeys = Array.from(soltrackBySerial.keys()).slice(0, 5);
      const clientKeys = Array.from(clientBySerial.keys()).slice(0, 5);
      const techKeys = Array.from(techBySerial.keys()).slice(0, 5);
      console.log(`[Stock Verification] Soltrack keys sample:`, soltrackKeys);
      console.log(`[Stock Verification] Client keys sample:`, clientKeys);
      console.log(`[Stock Verification] Tech keys sample:`, techKeys);
    }

    // 7. Apply search filter to vehicle matches
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
            String(m.stock_item?.category_code || ""),
            String(m.stock_item?.description || ""),
            String(m.stock_item?.code || ""),
            String(m.stock_item?.client_code || ""),
            String(m.stock_item?.technician_email || ""),
          ].join(" ").toLowerCase();
          return haystack.includes(search);
        })
      : vehicleMatches;

    // 8. Compute summary stats
    const soltrackCount = soltrackItems.length;
    const clientCount = clientItems.length;
    const techCount = techItems.length;
    const vehicleMatchCount = filteredMatches.length;

    // 9. Compute bucket breakdown for vehicle matches
    const bucketBreakdown = {
      soltrack: filteredMatches.filter((m) => m.bucket === "soltrack").length,
      client: filteredMatches.filter((m) => m.bucket === "client").length,
      technician: filteredMatches.filter((m) => m.bucket === "technician").length,
    };

    return NextResponse.json({
      soltrackCount,
      clientCount,
      techCount,
      vehicleMatchCount,
      bucketBreakdown,
      vehicleMatches: filteredMatches,
    });
  } catch (error) {
    console.error("Error in stock verification GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
