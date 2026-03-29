const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, "tmp", "epsc-0001-duplicate-charge-check.json");
const EPS_SOURCE_ACCOUNT = "EPSC-0001";
const EPS_PVT_TOTAL = 574;

const TOTAL_BILLING_COLUMNS = new Set([
  "total_rental_sub",
  "total_rental",
  "total_sub",
]);

const KNOWN_BILLABLE_COLUMNS = new Set([
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
  "skyspy_rental",
  "skyspy_sub",
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
  "software",
  "additional_data",
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
  "mtx_mc202x_rental",
  "mtx_mc202x_sub",
  "driver_app",
]);

const parseEnvFile = (filePath) =>
  Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1).replace(/^'+|'+$/g, "")];
      }),
  );

const toAmount = (value) => {
  const amount = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(amount) ? amount : 0;
};

const isSameAmount = (left, right) => Math.abs(left - right) < 0.001;

const getBucketForColumn = (column, amount) => {
  if (!column) return null;

  if (isSameAmount(amount, EPS_PVT_TOTAL)) {
    return "pvt";
  }

  if (/^beame_\d+_(rental|sub)$/i.test(column)) {
    return "beame";
  }

  if (column === "eps_software_development") {
    return isSameAmount(amount, 99) ? "routing" : "dashboard";
  }

  if (
    /^(sky|skylink|skyspy)/i.test(column) ||
    ["sky_idata_rental", "sky_ican_rental", "sky_on_batt_sub"].includes(column)
  ) {
    return "sky";
  }

  if (["driver_app", "software", "additional_data"].includes(column)) {
    return "routing";
  }

  if (
    [
      "controlroom",
      "consultancy",
      "maintenance",
      "after_hours",
      "_4ch_mdvr_rental",
      "_4ch_mdvr_sub",
      "_5ch_mdvr_rental",
      "_5ch_mdvr_sub",
      "_8ch_mdvr_rental",
      "_8ch_mdvr_sub",
      "mtx_mc202x_rental",
      "mtx_mc202x_sub",
    ].includes(column)
  ) {
    return "services";
  }

  return null;
};

async function main() {
  const env = parseEnvFile(path.join(ROOT, ".env.local"));
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("*")
    .or(`account_number.eq.${EPS_SOURCE_ACCOUNT},new_account_number.eq.${EPS_SOURCE_ACCOUNT}`);

  if (error) {
    throw error;
  }

  const report = {
    sourceAccountNumber: EPS_SOURCE_ACCOUNT,
    generatedAt: new Date().toISOString(),
    vehicleCount: vehicles?.length || 0,
    duplicateChargeAssignments: [],
    multiGroupVehicles: [],
    bucketTotals: {},
  };

  const bucketTotals = new Map();

  for (const vehicle of vehicles || []) {
    const vehicleKey = String(vehicle.reg || vehicle.fleet_number || vehicle.id || "");
    const assignmentsByColumn = new Map();
    const bucketsForVehicle = new Set();

    const totalRentalSub = toAmount(vehicle.total_rental_sub);
    if (isSameAmount(totalRentalSub, EPS_PVT_TOTAL)) {
      bucketsForVehicle.add("pvt");
      bucketTotals.set("pvt", (bucketTotals.get("pvt") || 0) + totalRentalSub);
    } else {
      for (const key of Object.keys(vehicle)) {
        if (!KNOWN_BILLABLE_COLUMNS.has(key) || TOTAL_BILLING_COLUMNS.has(key)) continue;
        const amount = toAmount(vehicle[key]);
        if (amount <= 0) continue;
        const bucket = getBucketForColumn(key, amount);
        if (!bucket) continue;
        const existing = assignmentsByColumn.get(key) || [];
        existing.push(bucket);
        assignmentsByColumn.set(key, existing);
        bucketsForVehicle.add(bucket);
        bucketTotals.set(bucket, (bucketTotals.get(bucket) || 0) + amount);
      }
    }

    for (const [column, buckets] of assignmentsByColumn.entries()) {
      const uniqueBuckets = Array.from(new Set(buckets));
      if (uniqueBuckets.length > 1) {
        report.duplicateChargeAssignments.push({
          vehicleKey,
          reg: vehicle.reg || "",
          fleetNumber: vehicle.fleet_number || "",
          column,
          buckets: uniqueBuckets,
          amount: toAmount(vehicle[column]),
        });
      }
    }

    if (bucketsForVehicle.size > 1) {
      report.multiGroupVehicles.push({
        vehicleKey,
        reg: vehicle.reg || "",
        fleetNumber: vehicle.fleet_number || "",
        buckets: Array.from(bucketsForVehicle).sort(),
      });
    }
  }

  report.bucketTotals = Object.fromEntries(
    Array.from(bucketTotals.entries()).sort((a, b) => a[0].localeCompare(b[0])),
  );
  report.summary = {
    duplicateChargeAssignmentCount: report.duplicateChargeAssignments.length,
    multiGroupVehicleCount: report.multiGroupVehicles.length,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

  console.log(`EPS duplicate-charge check written to ${OUTPUT_PATH}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
