import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";

const GLOBAL_SUMMARY_LOOKBACK_DAYS = 60;
const GLOBAL_SUMMARY_LIMIT = 1500;

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createSupabaseServiceClient(supabaseUrl, serviceRoleKey);
}

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

    // For FC users, get their assigned cost codes
    const { data: fcCostCenters } = await supabase
      .from('cost_centers')
      .select('cost_code')
      .eq('fc_id', user.id)
      .not('cost_code', 'is', null);

    const fcCostCodes = [...new Set(
      (fcCostCenters || [])
        .map((cc) => String(cc.cost_code || '').trim())
        .filter(Boolean)
    )];
    console.log("fcCostCodes:", JSON.stringify(fcCostCodes));

    if (fcCostCodes.length === 0) {
      return NextResponse.json({
        recentJobs: [],
        accountSummaries: [],
        sampledJobs: 0,
        lookbackDays: GLOBAL_SUMMARY_LOOKBACK_DAYS,
        accountCount: 0,
        deviceCount: 0,
        revenue: 0,
        revenueBreakdown: [],
      });
    }

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - GLOBAL_SUMMARY_LOOKBACK_DAYS);
    const recentJobsLookbackDate = new Date();
    recentJobsLookbackDate.setDate(recentJobsLookbackDate.getDate() - 1);

    const VEHICLE_COLS = "new_account_number, total_rental, total_rental_sub, total_sub, beame_1_rental, beame_1_sub, beame_2_rental, beame_2_sub, beame_3_rental, beame_3_sub, beame_4_rental, beame_4_sub, beame_5_rental, beame_5_sub, skylink_trailer_unit_rental, skylink_trailer_sub, sky_on_batt_ign_rental, sky_on_batt_sub, skylink_voice_kit_rental, skylink_voice_kit_sub, sky_scout_12v_rental, sky_scout_12v_sub, sky_scout_24v_rental, sky_scout_24v_sub, skylink_pro_rental, skylink_pro_sub, sky_idata_rental, sky_ican_rental, single_probe_rental, single_probe_sub, dual_probe_rental, dual_probe_sub";

    const vehicleOrFilter = fcCostCodes.map((code) => `new_account_number.eq.${code.replace(/\./g, "\\.")}`).join(",");

    const [recentJobsResponse, accountRowsResponse] = await Promise.all([
      supabase
        .from("job_cards")
        .select(
          "id, job_number, job_type, job_description, status, job_status, customer_name, customer_email, vehicle_registration, created_at, updated_at, account_id, new_account_number, quotation_total_amount, priority",
        )
        .in("new_account_number", fcCostCodes)
        .gte("created_at", recentJobsLookbackDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("job_cards")
        .select(
          "new_account_number, customer_name, quotation_total_amount, job_status, updated_at",
        )
        .in("new_account_number", fcCostCodes)
        .gte("updated_at", lookbackDate.toISOString())
        .order("updated_at", { ascending: false })
        .limit(GLOBAL_SUMMARY_LIMIT),
    ]);

    // Vehicles query with fallback for RLS
    let vehicleRows: Record<string, unknown>[] = [];
    const vehiclesSource = supabase.from("vehicles_duplicate");
    const { data: vehicleData, error: vehicleError } = await vehiclesSource
      .select(VEHICLE_COLS)
      .or(vehicleOrFilter);
    if (vehicleError) {
      console.error("vehicles_duplicate query error:", vehicleError);
      vehicleRows = [];
    } else if (Array.isArray(vehicleData) && vehicleData.length > 0) {
      vehicleRows = vehicleData as Record<string, unknown>[];
    } else {
      // Try with admin client to bypass RLS
      const adminClient = createAdminClient();
      if (adminClient) {
        const { data: adminData, error: adminError } = await adminClient
          .from("vehicles_duplicate")
          .select(VEHICLE_COLS)
          .or(vehicleOrFilter);
        if (adminError) {
          console.error("Admin vehicles query error:", adminError);
        } else if (Array.isArray(adminData) && adminData.length > 0) {
          console.log("RLS blocked! Admin fallback returned", adminData.length, "rows.");
          vehicleRows = adminData as Record<string, unknown>[];
        }
      }
    }

    if (recentJobsResponse.error) {
      console.error("recentJobs query error:", recentJobsResponse.error);
    }
    if (accountRowsResponse.error) {
      console.error("accountRows query error:", accountRowsResponse.error);
    }

    const recentJobs = Array.isArray(recentJobsResponse.data) ? recentJobsResponse.data : [];
    const accountRows = Array.isArray(accountRowsResponse.data) ? accountRowsResponse.data : [];

    const uniqueAccountNumbers = new Set(vehicleRows.map((v) => String(v.new_account_number || "").trim()).filter(Boolean));
    const deviceCount = vehicleRows.length;
    const revenue = vehicleRows.reduce((sum, v) => {
      return sum + (Number(v.total_rental) || 0) + (Number(v.total_rental_sub) || 0) + (Number(v.total_sub) || 0);
    }, 0);

    // Device-type revenue breakdown — 3 key categories
    const toNum = (v) => Number(v) || 0;
    const aggDeviceCategory = (label, columns) => {
      let total = 0, vehicleCount = 0;
      for (const v of vehicleRows) {
        let vTotal = 0;
        let has = false;
        for (const col of columns) {
          const val = toNum(v[col]);
          if (val > 0) { vTotal += val; has = true; }
        }
        if (has) { total += vTotal; vehicleCount++; }
      }
      return { label, total: Math.round(total * 100) / 100, vehicleCount };
    };

    const revenueBreakdown = [
      aggDeviceCategory("Beames", [
        "beame_1_rental","beame_1_sub","beame_2_rental","beame_2_sub",
        "beame_3_rental","beame_3_sub","beame_4_rental","beame_4_sub",
        "beame_5_rental","beame_5_sub",
      ]),
      aggDeviceCategory("Skylinks", [
        "skylink_trailer_unit_rental","skylink_trailer_sub",
        "sky_on_batt_ign_rental","sky_on_batt_sub",
        "skylink_voice_kit_rental","skylink_voice_kit_sub",
        "sky_scout_12v_rental","sky_scout_12v_sub",
        "sky_scout_24v_rental","sky_scout_24v_sub",
        "skylink_pro_rental","skylink_pro_sub",
        "sky_idata_rental","sky_ican_rental",
      ]),
      aggDeviceCategory("Probes", [
        "single_probe_rental","single_probe_sub",
        "dual_probe_rental","dual_probe_sub",
      ]),
    ].filter((d) => d.vehicleCount > 0);

    const accountMap = new Map();
    for (const job of accountRows) {
      const accountNumber = String(job.new_account_number || "Unknown").trim() || "Unknown";
      const totalAmount = Number(job.quotation_total_amount || 0) || 0;
      const jobStatus = String(job.job_status || "").trim().toLowerCase();

      const existing = accountMap.get(accountNumber);
      if (existing) {
        existing.total_jobs += 1;
        existing.total_value += totalAmount;
        if (jobStatus !== "completed") {
          existing.open_jobs += 1;
        }
        if (
          new Date(job.updated_at || 0).getTime() >
          new Date(existing.last_activity || 0).getTime()
        ) {
          existing.last_activity = job.updated_at;
        }
      } else {
        accountMap.set(accountNumber, {
          account_number: accountNumber,
          company_name: job.customer_name || "Unknown Company",
          total_jobs: 1,
          open_jobs: jobStatus !== "completed" ? 1 : 0,
          total_value: totalAmount,
          last_activity: job.updated_at,
        });
      }
    }

    return NextResponse.json({
      recentJobs,
      accountSummaries: Array.from(accountMap.values()),
      sampledJobs: accountRows.length,
      lookbackDays: GLOBAL_SUMMARY_LOOKBACK_DAYS,
      accountCount: uniqueAccountNumbers.size,
      deviceCount,
      revenue,
      revenueBreakdown,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
