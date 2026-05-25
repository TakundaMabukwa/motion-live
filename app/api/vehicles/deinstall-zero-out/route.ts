import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BILLABLE_FIELDS = [
  "skylink_trailer_unit_rental", "skylink_trailer_sub",
  "sky_on_batt_ign_rental", "sky_on_batt_sub",
  "skylink_voice_kit_rental", "skylink_voice_kit_sub",
  "sky_scout_12v_rental", "sky_scout_12v_sub",
  "sky_scout_24v_rental", "sky_scout_24v_sub",
  "skylink_pro_rental", "skylink_pro_sub",
  "skyspy_rental", "skyspy_sub",
  "sky_idata_rental", "sky_ican_rental",
  "industrial_panic_rental", "flat_panic_rental",
  "buzzer_rental", "tag_rental", "tag_reader_rental", "keypad_rental",
  "early_warning_rental", "cia_rental",
  "fm_unit_rental", "fm_unit_sub",
  "gps_rental", "gsm_rental",
  "tag_rental_", "tag_reader_rental_",
  "main_fm_harness_rental",
  "beame_1_rental", "beame_1_sub",
  "beame_2_rental", "beame_2_sub",
  "beame_3_rental", "beame_3_sub",
  "beame_4_rental", "beame_4_sub",
  "beame_5_rental", "beame_5_sub",
  "single_probe_rental", "single_probe_sub",
  "dual_probe_rental", "dual_probe_sub",
  "_7m_harness_for_probe_rental", "tpiece_rental", "idata_rental",
  "_1m_extension_cable_rental", "_3m_extension_cable_rental",
  "_4ch_mdvr_rental", "_4ch_mdvr_sub",
  "_5ch_mdvr_rental", "_5ch_mdvr_sub",
  "_8ch_mdvr_rental", "_8ch_mdvr_sub",
  "a2_dash_cam_rental", "a2_dash_cam_sub", "a3_dash_cam_ai_rental",
  "pfk_main_unit_rental", "pfk_main_unit_sub", "breathaloc_rental",
  "consultancy", "roaming", "maintenance", "after_hours", "controlroom",
  "software", "additional_data",
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, accountNumber, vehicleReg } = await request.json();

    if (!jobId && !(accountNumber && vehicleReg)) {
      return NextResponse.json(
        { error: "jobId or (accountNumber + vehicleReg) required" },
        { status: 400 },
      );
    }

    let targetAccount = accountNumber;
    let targetReg = vehicleReg;

    if (jobId && !targetReg) {
      const { data: job } = await supabase
        .from("job_cards")
        .select("new_account_number, vehicle_registration, quotation_products")
        .eq("id", jobId)
        .maybeSingle();

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      targetAccount = targetAccount || job.new_account_number;
      targetReg = targetReg || job.vehicle_registration;

      if (!targetReg) {
        const products = Array.isArray(job.quotation_products) ? job.quotation_products : [];
        const plates = [...new Set(products.map((p: any) => p?.vehicle_plate || "").filter(Boolean))];
        if (plates.length > 0) targetReg = plates[0];
      }
    }

    if (!targetReg) {
      return NextResponse.json({ error: "No vehicle registration found" }, { status: 400 });
    }

    const zeroUpdates: Record<string, number> = {};
    for (const field of BILLABLE_FIELDS) {
      zeroUpdates[field] = 0;
    }
    zeroUpdates.total_rental = 0;
    zeroUpdates.total_sub = 0;
    zeroUpdates.total_rental_sub = 0;

    let updateQuery = supabase
      .from("vehicles_duplicate")
      .update(zeroUpdates)
      .ilike("reg", targetReg);

    if (targetAccount) {
      updateQuery = updateQuery.eq("new_account_number", targetAccount);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error("Error zeroing out vehicles_duplicate:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, vehicle: targetReg, account: targetAccount });
  } catch (error) {
    console.error("Unexpected error in deinstall-zero-out:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
