import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SEARCH_SELECT =
  "id, reg, fleet_number, company, new_account_number, account_number, make, model, year, branch";

const JOB_SEARCH_SELECT =
  "id, job_number, customer_name, new_account_number, vehicle_registration, vehicle_make, vehicle_model, job_type, status, job_status, priority, role, created_at, due_date, completion_date";

const VEHICLE_IP_SELECT =
  "id, reg, fleet_number, company, new_account_number, make, model, year, branch, skylink_trailer_unit_ip, sky_on_batt_ign_unit_ip, skylink_voice_kit_ip, sky_scout_12v_ip, sky_scout_24v_ip, skylink_pro_ip, vw100ip_driver_facing_ip, skylink_trailer_unit_serial_number, sky_on_batt_ign_unit_serial_number, skylink_voice_kit_serial_number, sky_scout_12v_serial_number, sky_scout_24v_serial_number, skylink_pro_serial_number";

const INVENTORY_SELECT =
  "id, serial_number, category_code, status, container, direction, company, assigned_to_technician, notes, inventory_categories!inventory_items_category_fkey(description)";

const normalizeIdentifier = (value: string | null | undefined) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const dedupeVehicles = (vehicles: Array<Record<string, unknown>>) => {
  const seen = new Set<string>();
  const results: Array<Record<string, unknown>> = [];

  for (const vehicle of vehicles) {
    const id = String(vehicle.id || "").trim();
    const reg = normalizeIdentifier(String(vehicle.reg || ""));
    const fleet = normalizeIdentifier(String(vehicle.fleet_number || ""));
    const key = id || reg || fleet;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(vehicle);
  }

  return results;
};

const dedupeJobCards = (jobCards: Array<Record<string, unknown>>) => {
  const seen = new Set<string>();
  const results: Array<Record<string, unknown>> = [];

  for (const jobCard of jobCards) {
    const id = String(jobCard.id || "").trim();
    const jobNumber = normalizeIdentifier(String(jobCard.job_number || ""));
    const key = id || jobNumber;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(jobCard);
  }

  return results;
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
    const rawSearch = String(searchParams.get("search") || "").trim();
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      50,
    );

    if (rawSearch.length < 2) {
      return NextResponse.json({ vehicles: [], job_cards: [] });
    }

    const escapedSearch = rawSearch.replace(/[%_]/g, "").trim();
    const normalizedSearch = normalizeIdentifier(escapedSearch);

    const exactMatchesPromise = supabase
      .from("vehicles")
      .select(SEARCH_SELECT)
      .or(
        `reg.eq.${escapedSearch},fleet_number.eq.${escapedSearch},reg.eq.${normalizedSearch},fleet_number.eq.${normalizedSearch}`,
      )
      .limit(limit);

    const prefixMatchesPromise = supabase
      .from("vehicles")
      .select(SEARCH_SELECT)
      .or(`reg.ilike.${escapedSearch}%,fleet_number.ilike.${escapedSearch}%`)
      .limit(limit);

    const containsMatchesPromise = supabase
      .from("vehicles")
      .select(SEARCH_SELECT)
      .or(`reg.ilike.%${escapedSearch}%,fleet_number.ilike.%${escapedSearch}%`)
      .limit(limit);

    const exactJobMatchesPromise = supabase
      .from("job_cards")
      .select(JOB_SEARCH_SELECT)
      .or(
        `job_number.eq.${escapedSearch},job_number.eq.${normalizedSearch},new_account_number.eq.${escapedSearch},vehicle_registration.eq.${escapedSearch},vehicle_registration.eq.${normalizedSearch}`,
      )
      .limit(limit);

    const prefixJobMatchesPromise = supabase
      .from("job_cards")
      .select(JOB_SEARCH_SELECT)
      .or(
        `job_number.ilike.${escapedSearch}%,customer_name.ilike.${escapedSearch}%,new_account_number.ilike.${escapedSearch}%,vehicle_registration.ilike.${escapedSearch}%`,
      )
      .limit(limit);

    const containsJobMatchesPromise = supabase
      .from("job_cards")
      .select(JOB_SEARCH_SELECT)
      .or(
        `job_number.ilike.%${escapedSearch}%,customer_name.ilike.%${escapedSearch}%,new_account_number.ilike.%${escapedSearch}%,vehicle_registration.ilike.%${escapedSearch}%`,
      )
      .limit(limit);

    // IP search across vehicles_duplicate IP columns
    const ipSearchPromise = supabase
      .from("vehicles_duplicate")
      .select(VEHICLE_IP_SELECT)
      .or(
        `skylink_trailer_unit_ip.ilike.%${escapedSearch}%,` +
        `sky_on_batt_ign_unit_ip.ilike.%${escapedSearch}%,` +
        `skylink_voice_kit_ip.ilike.%${escapedSearch}%,` +
        `sky_scout_12v_ip.ilike.%${escapedSearch}%,` +
        `sky_scout_24v_ip.ilike.%${escapedSearch}%,` +
        `skylink_pro_ip.ilike.%${escapedSearch}%,` +
        `vw100ip_driver_facing_ip.ilike.%${escapedSearch}%`
      )
      .limit(limit);

    // Serial search across inventory_items
    const inventorySearchPromise = supabase
      .from("inventory_items")
      .select(INVENTORY_SELECT)
      .ilike("serial_number", `%${escapedSearch}%`)
      .limit(limit);

    // Serial search across job_cards old/new serial + ip_address
    const jobSerialSearchPromise = supabase
      .from("job_cards")
      .select(JOB_SEARCH_SELECT)
      .or(
        `old_serial_number.ilike.%${escapedSearch}%,new_serial_number.ilike.%${escapedSearch}%,ip_address.ilike.%${escapedSearch}%`
      )
      .limit(limit);

    const [
      exactMatches,
      prefixMatches,
      containsMatches,
      exactJobMatches,
      prefixJobMatches,
      containsJobMatches,
      ipSearchResults,
      inventorySearchResults,
      jobSerialResults,
    ] = await Promise.all([
      exactMatchesPromise,
      prefixMatchesPromise,
      containsMatchesPromise,
      exactJobMatchesPromise,
      prefixJobMatchesPromise,
      containsJobMatchesPromise,
      ipSearchPromise,
      inventorySearchPromise,
      jobSerialSearchPromise,
    ]);

    if (
      exactMatches.error ||
      prefixMatches.error ||
      containsMatches.error ||
      exactJobMatches.error ||
      prefixJobMatches.error ||
      containsJobMatches.error
    ) {
      console.error("Vehicle global search error:", {
        exact: exactMatches.error,
        prefix: prefixMatches.error,
        contains: containsMatches.error,
        exactJob: exactJobMatches.error,
        prefixJob: prefixJobMatches.error,
        containsJob: containsJobMatches.error,
      });
      return NextResponse.json(
        { error: "Failed to search vehicles and job cards" },
        { status: 500 },
      );
    }

    const vehicles = dedupeVehicles([
      ...(exactMatches.data || []),
      ...(prefixMatches.data || []),
      ...(containsMatches.data || []),
    ]).slice(0, limit);

    const jobCards = dedupeJobCards([
      ...(exactJobMatches.data || []),
      ...(prefixJobMatches.data || []),
      ...(containsJobMatches.data || []),
      ...(jobSerialResults.data || []),
    ]).slice(0, limit);

    // Process IP search results - show which reg the IP belongs to
    const ipResults: Array<{
      resultType: "vehicle_ip";
      id: number | string;
      reg: string | null;
      ip_address: string;
      matched_column: string;
      company: string | null;
      fleet_number: string | null;
      make: string | null;
      model: string | null;
    }> = [];

    if (!ipSearchResults.error && ipSearchResults.data) {
      const ipColumns = [
        { key: "skylink_trailer_unit_ip", label: "Skylink Trailer Unit IP" },
        { key: "sky_on_batt_ign_unit_ip", label: "Sky Batt/Ign Unit IP" },
        { key: "skylink_voice_kit_ip", label: "Skylink Voice Kit IP" },
        { key: "sky_scout_12v_ip", label: "Sky Scout 12V IP" },
        { key: "sky_scout_24v_ip", label: "Sky Scout 24V IP" },
        { key: "skylink_pro_ip", label: "Skylink Pro IP" },
        { key: "vw100ip_driver_facing_ip", label: "VW100IP Driver Facing IP" },
      ];

      const seenIpVehicles = new Set<string>();
      for (const vehicle of ipSearchResults.data) {
        for (const col of ipColumns) {
          const val = vehicle[col.key as keyof typeof vehicle];
          if (
            typeof val === "string" &&
            val.toLowerCase().includes(escapedSearch.toLowerCase())
          ) {
            const vehicleKey = `${vehicle.id}:${col.key}`;
            if (!seenIpVehicles.has(vehicleKey)) {
              seenIpVehicles.add(vehicleKey);
              ipResults.push({
                resultType: "vehicle_ip",
                id: vehicle.id,
                reg: vehicle.reg,
                ip_address: val,
                matched_column: col.label,
                company: vehicle.company,
                fleet_number: vehicle.fleet_number,
                make: vehicle.make,
                model: vehicle.model,
              });
            }
            break;
          }
        }
      }
    }

    // Process inventory search results - show stock status
    const inventoryResults: Array<{
      resultType: "inventory_item";
      id: number | string;
      serial_number: string;
      category_code: string | null;
      status: string | null;
      container: string | null;
      direction: string | null;
      company: string | null;
      assigned_to_technician: string | null;
      notes: string | null;
      category_description: string | null;
    }> = [];

    if (!inventorySearchResults.error && inventorySearchResults.data) {
      for (const item of inventorySearchResults.data) {
        const catDesc =
          item.inventory_categories &&
          typeof item.inventory_categories === "object" &&
          "description" in (item.inventory_categories as Record<string, unknown>)
            ? String(
                (item.inventory_categories as Record<string, unknown>)
                  .description || ""
              )
            : null;

        inventoryResults.push({
          resultType: "inventory_item",
          id: item.id,
          serial_number: item.serial_number || "",
          category_code: item.category_code,
          status: item.status,
          container: item.container,
          direction: item.direction,
          company: item.company,
          assigned_to_technician: item.assigned_to_technician,
          notes: item.notes,
          category_description: catDesc,
        });
      }
    }

    return NextResponse.json({
      vehicles,
      job_cards: jobCards,
      vehicle_ips: ipResults,
      inventory_items: inventoryResults,
    });
  } catch (error) {
    console.error("Vehicle global search route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
