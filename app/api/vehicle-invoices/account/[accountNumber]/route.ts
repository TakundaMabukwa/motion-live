import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BILLABLE_COLUMNS = new Set([
  "skylink_trailer_unit_rental",
  "skylink_trailer_sub",
  "sky_on_batt_ign_rental",
  "sky_on_batt_sub",
  "skylink_voice_kit_rental",
  "skylink_voice_kit_sub",
  "sky_scout_12v_rental",
  "sky_scout_12v_sub",
  "sky_scout_24v_rental",
  "sky_scout_24v_sub",
  "skylink_pro_rental",
  "skylink_pro_sub",
  "sky_idata_rental",
  "sky_ican_rental",
  "industrial_panic_rental",
  "flat_panic_rental",
  "buzzer_rental",
  "tag_rental",
  "tag_reader_rental",
  "keypad_rental",
  "early_warning_rental",
  "cia_rental",
  "fm_unit_rental",
  "fm_unit_sub",
  "gps_rental",
  "gsm_rental",
  "tag_rental_",
  "tag_reader_rental_",
  "main_fm_harness_rental",
  "beame_1_rental",
  "beame_1_sub",
  "beame_2_rental",
  "beame_2_sub",
  "beame_3_rental",
  "beame_3_sub",
  "beame_4_rental",
  "beame_4_sub",
  "beame_5_rental",
  "beame_5_sub",
  "single_probe_rental",
  "single_probe_sub",
  "dual_probe_rental",
  "dual_probe_sub",
  "_7m_harness_for_probe_rental",
  "tpiece_rental",
  "idata_rental",
  "_1m_extension_cable_rental",
  "_3m_extension_cable_rental",
  "_4ch_mdvr_rental",
  "_4ch_mdvr_sub",
  "_5ch_mdvr_rental",
  "_5ch_mdvr_sub",
  "_8ch_mdvr_rental",
  "_8ch_mdvr_sub",
  "a2_dash_cam_rental",
  "a2_dash_cam_sub",
  "a3_dash_cam_ai_rental",
  "_5m_cable_for_camera_4pin_rental",
  "_5m_cable_6pin_rental",
  "_10m_cable_for_camera_4pin_rental",
  "a2_mec_5_rental",
  "vw400_dome_1_rental",
  "vw400_dome_2_rental",
  "vw300_dakkie_dome_1_rental",
  "vw300_dakkie_dome_2_rental",
  "vw502_dual_lens_camera_rental",
  "vw303_driver_facing_camera_rental",
  "vw502f_road_facing_camera_rental",
  "vw306_dvr_road_facing_for_4ch_8ch_rental",
  "vw306m_a2_dash_cam_rental",
  "dms01_driver_facing_rental",
  "adas_02_road_facing_rental",
  "vw100ip_driver_facing_rental",
  "sd_card_1tb_rental",
  "sd_card_2tb_rental",
  "sd_card_480gb_rental",
  "sd_card_256gb_rental",
  "sd_card_512gb_rental",
  "sd_card_250gb_rental",
  "mic_rental",
  "speaker_rental",
  "pfk_main_unit_rental",
  "pfk_main_unit_sub",
  "breathaloc_rental",
  "pfk_road_facing_rental",
  "pfk_driver_facing_rental",
  "pfk_dome_1_rental",
  "pfk_dome_2_rental",
  "pfk_5m_rental",
  "pfk_10m_rental",
  "pfk_15m_rental",
  "pfk_20m_rental",
  "roller_door_switches_rental",
  "consultancy",
  "roaming",
  "maintenance",
  "after_hours",
  "controlroom",
  "eps_software_development",
  "maysene_software_development",
  "waterford_software_development",
  "klaver_software_development",
  "advatrans_software_development",
  "tt_linehaul_software_development",
  "tt_express_software_development",
  "tt_fmcg_software_development",
  "rapid_freight_software_development",
  "remco_freight_software_development",
  "vt_logistics_software_development",
  "epilite_software_development",
  "total_rental_sub",
  "total_rental",
  "total_sub",
  "software",
  "additional_data",
]);

const SERVICE_ONLY_COLUMNS = new Set([
  "consultancy",
  "roaming",
  "maintenance",
  "after_hours",
  "controlroom",
  "eps_software_development",
  "maysene_software_development",
  "waterford_software_development",
  "klaver_software_development",
  "advatrans_software_development",
  "tt_linehaul_software_development",
  "tt_express_software_development",
  "tt_fmcg_software_development",
  "rapid_freight_software_development",
  "remco_freight_software_development",
  "vt_logistics_software_development",
  "epilite_software_development",
  "software",
  "additional_data",
  "total_rental_sub",
  "total_rental",
  "total_sub",
]);

function safeNumber(value: unknown) {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function hasEquipmentForBilling(vehicle: Record<string, any>, column: string) {
  if (SERVICE_ONLY_COLUMNS.has(column)) return true;
  const baseFieldName = column.replace(/_rental$/, "").replace(/_sub$/, "");
  return String(vehicle?.[baseFieldName] || "").trim().length > 0;
}

function buildVehicleStatementRow(
  vehicle: Record<string, any>,
  monthsLate: number,
) {
  let totalExVat = 0;

  for (const key of Object.keys(vehicle)) {
    if (!BILLABLE_COLUMNS.has(key)) continue;
    if (!hasEquipmentForBilling(vehicle, key)) continue;
    totalExVat += safeNumber(vehicle[key]);
  }

  const totalVat = totalExVat * 0.15;
  const totalInclVat = totalExVat + totalVat;
  const overdue1_30 = monthsLate >= 1 ? totalInclVat : 0;
  const overdue31_60 = monthsLate >= 2 ? totalInclVat : 0;
  const overdue61_90 = monthsLate >= 3 ? totalInclVat : 0;
  const overdue91_plus = monthsLate >= 4 ? totalInclVat : 0;
  const totalOverdue =
    overdue1_30 + overdue31_60 + overdue61_90 + overdue91_plus;

  return {
    id: vehicle.id,
    stock_code: vehicle.reg || vehicle.fleet_number || `VEH-${vehicle.id}`,
    stock_description:
      [vehicle.make, vehicle.model, vehicle.year]
        .filter(Boolean)
        .join(" ")
        .trim() || "Vehicle",
    one_month: totalExVat.toFixed(2),
    "2nd_month": "0.00",
    "3rd_month": "0.00",
    total_ex_vat: totalExVat.toFixed(2),
    total_vat: totalVat.toFixed(2),
    total_incl_vat: totalInclVat.toFixed(2),
    group_name: vehicle.company || "Unknown",
    beame: vehicle.beame_1 || "",
    beame_2: vehicle.beame_2 || "",
    beame_3: vehicle.beame_3 || "",
    ip_address:
      vehicle.skylink_trailer_unit_ip ||
      vehicle.sky_on_batt_ign_unit_ip ||
      vehicle.skylink_voice_kit_ip ||
      vehicle.sky_scout_12v_ip ||
      vehicle.sky_scout_24v_ip ||
      vehicle.skylink_pro_ip ||
      "",
    new_account_number:
      vehicle.new_account_number || vehicle.account_number || "",
    company: vehicle.company || "Unknown",
    doc_no: vehicle.reg || vehicle.fleet_number || `VEH-${vehicle.id}`,
    monthlyAmount: totalInclVat,
    overdue1_30,
    overdue31_60,
    overdue61_90,
    overdue91_plus,
    totalOverdue,
    monthsLate,
    isOverdue: totalOverdue > 0,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { accountNumber: string } },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountNumber = params.accountNumber;
    const now = new Date();
    const monthsLate = now.getDate() > 21 ? 1 : 0;

    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("*")
      .or(
        `new_account_number.eq.${accountNumber},account_number.eq.${accountNumber}`,
      );

    if (error) {
      console.error("Error fetching vehicles for account:", error);
      return NextResponse.json(
        { error: "Failed to fetch vehicles" },
        { status: 500 },
      );
    }

    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({
        success: true,
        accountNumber,
        vehicles: [],
        message: "No vehicles found for this account",
      });
    }

    const statementVehicles = vehicles
      .map((vehicle) => buildVehicleStatementRow(vehicle, monthsLate))
      .filter(
        (vehicle) =>
          safeNumber(vehicle.total_incl_vat) > 0 || vehicle.stock_code,
      );

    const totalMonthlyAmount = statementVehicles.reduce(
      (sum, vehicle) => sum + vehicle.monthlyAmount,
      0,
    );
    const totalOverdueAmount = statementVehicles.reduce(
      (sum, vehicle) => sum + vehicle.totalOverdue,
      0,
    );

    return NextResponse.json({
      success: true,
      accountNumber,
      company: vehicles[0]?.company || "Unknown",
      vehicles: statementVehicles.sort(
        (a, b) => b.monthlyAmount - a.monthlyAmount,
      ),
      summary: {
        totalVehicles: statementVehicles.length,
        totalMonthlyAmount,
        totalOverdueAmount,
        monthsLate,
      },
    });
  } catch (error) {
    console.error("Error in account vehicle fetch:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
