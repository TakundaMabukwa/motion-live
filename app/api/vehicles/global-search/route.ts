import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SEARCH_SELECT =
  "id, reg, fleet_number, company, new_account_number, account_number, make, model, year, branch";

const JOB_SEARCH_SELECT =
  "id, job_number, customer_name, new_account_number, vehicle_registration, vehicle_make, vehicle_model, job_type, status, job_status, priority, role, created_at, due_date, completion_date";

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
      .or(`job_number.eq.${escapedSearch},job_number.eq.${normalizedSearch}`)
      .limit(limit);

    const prefixJobMatchesPromise = supabase
      .from("job_cards")
      .select(JOB_SEARCH_SELECT)
      .ilike("job_number", `${escapedSearch}%`)
      .limit(limit);

    const [
      exactMatches,
      prefixMatches,
      containsMatches,
      exactJobMatches,
      prefixJobMatches,
    ] = await Promise.all([
      exactMatchesPromise,
      prefixMatchesPromise,
      containsMatchesPromise,
      exactJobMatchesPromise,
      prefixJobMatchesPromise,
    ]);

    if (
      exactMatches.error ||
      prefixMatches.error ||
      containsMatches.error ||
      exactJobMatches.error ||
      prefixJobMatches.error
    ) {
      console.error("Vehicle global search error:", {
        exact: exactMatches.error,
        prefix: prefixMatches.error,
        contains: containsMatches.error,
        exactJob: exactJobMatches.error,
        prefixJob: prefixJobMatches.error,
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
    ]).slice(0, limit);

    return NextResponse.json({ vehicles, job_cards: jobCards });
  } catch (error) {
    console.error("Vehicle global search route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
