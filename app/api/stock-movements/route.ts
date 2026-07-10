import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 1) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 },
    );
  }

  try {
    const likePattern = `%${q}%`;

    const [
      movementResult,
      inventoryResult,
      clientResult,
      techResult,
      jobResult,
      vehicleResult,
    ] = await Promise.all([
      supabase
        .from("stock_movements")
        .select("*")
        .or(`serial_number.ilike.${likePattern},job_number.ilike.${likePattern}`)
        .order("created_at", { ascending: true }),

      supabase
        .from("inventory_items")
        .select("id, serial_number, category_code, status, assigned_to_technician, job_card_id, company, notes, container")
        .ilike("serial_number", likePattern)
        .limit(10),

      supabase
        .from("client_inventory_items")
        .select("id, serial_number, category_code, status, assigned_to_technician, job_card_id, client_code, cost_code, company, notes")
        .ilike("serial_number", likePattern)
        .limit(10),

      supabase
        .from("tech_stock")
        .select("technician_email, assigned_parts")
        .or(`assigned_parts.cs.@> [{"serial_number":"${q}"}],assigned_parts.cs.@> [{"serial":"${q}"}],assigned_parts.cs.@> [{"serialNumber":"${q}"}],assigned_parts.cs.@> [{"ip_address":"${q}"}]`)
        .limit(50),

      supabase
        .from("job_cards")
        .select("id, job_number, vehicle_registration, customer_name, old_serial_number, new_serial_number, ip_address, job_type, status, job_status")
        .or(`job_number.ilike.${likePattern},vehicle_registration.ilike.${likePattern},customer_name.ilike.${likePattern},old_serial_number.ilike.${likePattern},new_serial_number.ilike.${likePattern},ip_address.ilike.${likePattern}`)
        .limit(20),

      supabase
        .from("vehicles_duplicate")
        .select("id, reg, fleet_number, make, model, new_account_number, skylink_trailer_unit_ip, skylink_trailer_unit_serial_number, sky_on_batt_ign_unit_ip, sky_on_batt_ign_unit_serial_number, skylink_voice_kit_ip, skylink_voice_kit_serial_number, sky_scout_12v_ip, sky_scout_12v_serial_number, sky_scout_24v_ip, sky_scout_24v_serial_number, skylink_pro_ip, skylink_pro_serial_number, vw100ip_driver_facing_ip")
        .or(
          `skylink_trailer_unit_ip.ilike.${likePattern},` +
          `skylink_trailer_unit_serial_number.ilike.${likePattern},` +
          `sky_on_batt_ign_unit_ip.ilike.${likePattern},` +
          `sky_on_batt_ign_unit_serial_number.ilike.${likePattern},` +
          `skylink_voice_kit_ip.ilike.${likePattern},` +
          `skylink_voice_kit_serial_number.ilike.${likePattern},` +
          `sky_scout_12v_ip.ilike.${likePattern},` +
          `sky_scout_12v_serial_number.ilike.${likePattern},` +
          `sky_scout_24v_ip.ilike.${likePattern},` +
          `sky_scout_24v_serial_number.ilike.${likePattern},` +
          `skylink_pro_ip.ilike.${likePattern},` +
          `skylink_pro_serial_number.ilike.${likePattern},` +
          `vw100ip_driver_facing_ip.ilike.${likePattern},` +
          `reg.ilike.${likePattern},` +
          `fleet_number.ilike.${likePattern}`
        )
        .limit(20),
    ]);

    if (movementResult.error) {
      console.error("stock_movements query error:", movementResult.error);
    }
    if (inventoryResult.error) {
      console.error("inventory_items query error:", inventoryResult.error);
    }
    if (clientResult.error) {
      console.error("client_inventory_items query error:", clientResult.error);
    }
    if (techResult.error) {
      console.error("tech_stock query error:", techResult.error);
    }
    if (jobResult.error) {
      console.error("job_cards query error:", jobResult.error);
    }
    if (vehicleResult.error) {
      console.error("vehicles_duplicate query error:", vehicleResult.error);
    }

    const movements = movementResult.data || [];
    const inventoryItems = inventoryResult.data || [];
    const clientItems = clientResult.data || [];
    const jobMatches = jobResult.data || [];
    const vehicleMatches = vehicleResult.data || [];

    type CurrentLocation = {
      bucket: string;
      owner: string | null;
      status: string | null;
      job_number: string | null;
      client_code: string | null;
      cost_code: string | null;
      found_in: string;
      serial_number: string;
      category_code: string | null;
    };

    const currentLocations: CurrentLocation[] = [];

    // Batch fetch job_numbers for all items with job_card_id
    const allItemsWithJobCard = [
      ...inventoryItems.filter(i => i.job_card_id),
      ...clientItems.filter(i => i.job_card_id),
    ];
    const jobCardIds = [...new Set(allItemsWithJobCard.map(i => i.job_card_id))];
    let jobMap = new Map<string, string>();
    if (jobCardIds.length > 0) {
      const { data: jobs } = await supabase
        .from("job_cards")
        .select("id, job_number")
        .in("id", jobCardIds);
      jobMap = new Map(jobs?.map(j => [j.id, j.job_number]) || []);
    }

    for (const item of inventoryItems) {
      const jobNumber = item.job_card_id ? jobMap.get(item.job_card_id) || null : null;
      currentLocations.push({
        bucket: "soltrack",
        owner: null,
        status: item.status,
        job_number: jobNumber,
        client_code: null,
        cost_code: null,
        found_in: "inventory_items",
        serial_number: item.serial_number,
        category_code: item.category_code,
      });
    }

    for (const item of clientItems) {
      const jobNumber = item.job_card_id ? jobMap.get(item.job_card_id) || null : null;
      currentLocations.push({
        bucket: "client",
        owner: item.client_code,
        status: item.status,
        job_number: jobNumber,
        client_code: item.client_code,
        cost_code: item.cost_code,
        found_in: "client_inventory_items",
        serial_number: item.serial_number,
        category_code: item.category_code,
      });
    }

    // Process tech_stock matches
    const techMatches: { technician_email: string; part: Record<string, unknown> }[] = [];
    for (const row of techResult.data || []) {
      if (!Array.isArray(row.assigned_parts)) continue;
      for (const part of row.assigned_parts) {
        const sn = part?.serial_number || part?.serial || part?.serialNumber || "";
        const ip = part?.ip_address || "";
        if (
          (typeof sn === "string" && sn.toLowerCase().includes(q.toLowerCase())) ||
          (typeof ip === "string" && ip.toLowerCase().includes(q.toLowerCase()))
        ) {
          techMatches.push({ technician_email: row.technician_email, part });
        }
      }
    }

    for (const match of techMatches) {
      const part = match.part;
      const serial =
        part?.serial_number || part?.serial || part?.serialNumber || "";
      const category =
        part?.category_code || part?.code || null;
      currentLocations.push({
        bucket: "tech",
        owner: match.technician_email,
        status: "ASSIGNED",
        job_number: null,
        client_code: null,
        cost_code: null,
        found_in: "tech_stock",
        serial_number: serial,
        category_code: category,
      });
    }

    // Add job matches as current locations (for serials found on jobs)
    for (const job of jobMatches) {
      const serial = job.old_serial_number || job.new_serial_number || job.ip_address;
      if (serial) {
        currentLocations.push({
          bucket: "job",
          owner: job.customer_name,
          status: job.status || job.job_status,
          job_number: job.job_number,
          client_code: null,
          cost_code: null,
          found_in: "job_cards",
          serial_number: serial,
          category_code: null,
        });
      }
    }

    // Add vehicle matches
    for (const vehicle of vehicleMatches) {
      const ipColumns = [
        { key: "skylink_trailer_unit_ip", label: "Skylink Trailer IP" },
        { key: "sky_on_batt_ign_unit_ip", label: "Sky Batt/Ign IP" },
        { key: "skylink_voice_kit_ip", label: "Skylink Voice Kit IP" },
        { key: "sky_scout_12v_ip", label: "Sky Scout 12V IP" },
        { key: "sky_scout_24v_ip", label: "Sky Scout 24V IP" },
        { key: "skylink_pro_ip", label: "Skylink Pro IP" },
        { key: "vw100ip_driver_facing_ip", label: "VW100IP Driver Facing" },
      ];

      const serialColumns = [
        { key: "skylink_trailer_unit_serial_number", label: "Skylink Trailer Serial" },
        { key: "sky_on_batt_ign_unit_serial_number", label: "Sky Batt/Ign Serial" },
        { key: "skylink_voice_kit_serial_number", label: "Skylink Voice Kit Serial" },
        { key: "sky_scout_12v_serial_number", label: "Sky Scout 12V Serial" },
        { key: "sky_scout_24v_serial_number", label: "Sky Scout 24V Serial" },
        { key: "skylink_pro_serial_number", label: "Skylink Pro Serial" },
      ];

      let matchedField = "";
      let matchedValue = "";

      for (const col of ipColumns) {
        const val = vehicle[col.key as keyof typeof vehicle];
        if (typeof val === "string" && val.toLowerCase().includes(q.toLowerCase())) {
          matchedField = col.label;
          matchedValue = val;
          break;
        }
      }

      if (!matchedField) {
        for (const col of serialColumns) {
          const val = vehicle[col.key as keyof typeof vehicle];
          if (typeof val === "string" && val.toLowerCase().includes(q.toLowerCase())) {
            matchedField = col.label;
            matchedValue = val;
            break;
          }
        }
      }

      if (!matchedField) {
        if (vehicle.reg?.toLowerCase().includes(q.toLowerCase())) {
          matchedField = "Registration";
          matchedValue = vehicle.reg;
        } else if (vehicle.fleet_number?.toLowerCase().includes(q.toLowerCase())) {
          matchedField = "Fleet Number";
          matchedValue = vehicle.fleet_number;
        }
      }

      if (matchedValue) {
        currentLocations.push({
          bucket: "vehicle",
          owner: vehicle.make ? `${vehicle.make} ${vehicle.model || ""}`.trim() : "Vehicle",
          status: "ON VEHICLE",
          job_number: null,
          client_code: vehicle.new_account_number,
          cost_code: null,
          found_in: "vehicles_duplicate",
          serial_number: matchedValue,
          category_code: matchedField,
        });
      }
    }

    // Deduplicate current locations by serial_number (keep first)
    const seen = new Set<string>();
    const dedupedLocations = currentLocations.filter(loc => {
      if (seen.has(loc.serial_number)) return false;
      seen.add(loc.serial_number);
      return true;
    });

    const allSerials = [
      ...dedupedLocations.map((l) => l.serial_number),
      ...movements.map((m) => m.serial_number),
    ];
    const uniqueSerials = [...new Set(allSerials)];

    return NextResponse.json({
      query: q,
      current: dedupedLocations,
      movements,
      unique_serials: uniqueSerials,
      job_matches: jobMatches,
      vehicle_matches: vehicleMatches,
    });
  } catch (err) {
    console.error("stock-movements API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}