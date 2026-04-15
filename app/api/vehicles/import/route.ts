import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

// Helper functions for billing lock
const BILLABLE_VEHICLE_FIELD_SET = new Set([
  'skylink_trailer_unit_rental', 'skylink_trailer_sub', 'sky_on_batt_ign_rental', 'sky_on_batt_sub',
  'skylink_voice_kit_rental', 'skylink_voice_kit_sub', 'sky_scout_12v_rental', 'sky_scout_12v_sub',
  'sky_scout_24v_rental', 'sky_scout_24v_sub', 'skylink_pro_rental', 'skylink_pro_sub',
  'skyspy_rental', 'skyspy_sub', 'sky_idata_rental', 'sky_ican_rental', 'industrial_panic_rental',
  'flat_panic_rental', 'buzzer_rental', 'tag_rental', 'tag_reader_rental', 'keypad_rental',
  'early_warning_rental', 'cia_rental', 'fm_unit_rental', 'fm_unit_sub', 'gps_rental', 'gsm_rental',
  'tag_rental_', 'tag_reader_rental_', 'main_fm_harness_rental', 'beame_1_rental', 'beame_1_sub',
  'beame_2_rental', 'beame_2_sub', 'beame_3_rental', 'beame_3_sub', 'beame_4_rental', 'beame_4_sub',
  'beame_5_rental', 'beame_5_sub', 'single_probe_rental', 'single_probe_sub', 'dual_probe_rental',
  'dual_probe_sub', '_7m_harness_for_probe_rental', 'tpiece_rental', 'idata_rental',
  '_1m_extension_cable_rental', '_3m_extension_cable_rental', '_4ch_mdvr_rental', '_4ch_mdvr_sub',
  '_5ch_mdvr_rental', '_5ch_mdvr_sub', '_8ch_mdvr_rental', '_8ch_mdvr_sub', 'a2_dash_cam_rental',
  'a2_dash_cam_sub', 'a3_dash_cam_ai_rental', '_5m_cable_for_camera_4pin_rental',
  '_5m_cable_6pin_rental', '_10m_cable_for_camera_4pin_rental', 'a2_mec_5_rental',
  'vw400_dome_1_rental', 'vw400_dome_2_rental', 'vw300_dakkie_dome_1_rental',
  'vw300_dakkie_dome_2_rental', 'vw502_dual_lens_camera_rental', 'vw303_driver_facing_camera_rental',
  'vw502f_road_facing_camera_rental', 'vw306_dvr_road_facing_for_4ch_8ch_rental',
  'vw306m_a2_dash_cam_rental', 'dms01_driver_facing_rental', 'adas_02_road_facing_rental',
  'vw100ip_driver_facing_rental', 'sd_card_1tb_rental', 'sd_card_2tb_rental', 'sd_card_480gb_rental',
  'sd_card_256gb_rental', 'sd_card_512gb_rental', 'sd_card_250gb_rental', 'mic_rental',
  'speaker_rental', 'pfk_main_unit_rental', 'pfk_main_unit_sub', 'breathaloc_rental',
  'pfk_road_facing_rental', 'pfk_driver_facing_rental', 'pfk_dome_1_rental', 'pfk_dome_2_rental',
  'pfk_5m_rental', 'pfk_10m_rental', 'pfk_15m_rental', 'pfk_20m_rental',
  'roller_door_switches_rental', 'consultancy', 'roaming', 'maintenance', 'after_hours',
  'controlroom', 'eps_software_development', 'maysene_software_development',
  'waterford_software_development', 'klaver_software_development', 'advatrans_software_development',
  'tt_linehaul_software_development', 'tt_express_software_development', 'tt_fmcg_software_development',
  'rapid_freight_software_development', 'remco_freight_software_development',
  'vt_logistics_software_development', 'epilite_software_development', 'total_rental_sub',
  'total_rental', 'total_sub', 'software', 'additional_data'
]);

async function isBillingLocked(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('system_locks')
    .select('is_locked')
    .eq('lock_key', 'billing')
    .single();
  return data?.is_locked || false;
}

const VEHICLE_DB_COLUMNS = new Set([
  "company",
  "new_account_number",
  "branch",
  "unique_id",
  "fleet_number",
  "reg",
  "make",
  "model",
  "vin",
  "engine",
  "year",
  "colour",
  "skylink_trailer_unit_serial_number",
  "skylink_trailer_unit_ip",
  "sky_on_batt_ign_unit_serial_number",
  "sky_on_batt_ign_unit_ip",
  "skylink_voice_kit_serial_number",
  "skylink_voice_kit_ip",
  "sky_scout_12v_serial_number",
  "sky_scout_12v_ip",
  "sky_scout_24v_serial_number",
  "sky_scout_24v_ip",
  "skylink_pro_serial_number",
  "skylink_pro_ip",
  "skyspy",
  "skylink_sim_card_no",
  "skylink_data_number",
  "sky_safety",
  "sky_idata",
  "sky_ican",
  "industrial_panic",
  "flat_panic",
  "buzzer",
  "tag",
  "tag_reader",
  "keypad",
  "keypad_waterproof",
  "early_warning",
  "cia",
  "fm_unit",
  "sim_card_number",
  "data_number",
  "gps",
  "gsm",
  "tag_",
  "tag_reader_",
  "main_fm_harness",
  "beame_1",
  "beame_2",
  "beame_3",
  "beame_4",
  "beame_5",
  "fuel_probe_1",
  "fuel_probe_2",
  "_7m_harness_for_probe",
  "tpiece",
  "idata",
  "_1m_extension_cable",
  "_3m_extension_cable",
  "_4ch_mdvr",
  "_5ch_mdvr",
  "_8ch_mdvr",
  "a2_dash_cam",
  "a3_dash_cam_ai",
  "corpconnect_sim_no",
  "corpconnect_data_no",
  "sim_id",
  "_5m_cable_for_camera_4pin",
  "_5m_cable_6pin",
  "_10m_cable_for_camera_4pin",
  "a2_mec_5",
  "vw400_dome_1",
  "vw400_dome_2",
  "vw300_dakkie_dome_1",
  "vw300_dakkie_dome_2",
  "vw502_dual_lens_camera",
  "vw303_driver_facing_camera",
  "vw502f_road_facing_camera",
  "vw306_dvr_road_facing_for_4ch_8ch",
  "vw306m_a2_dash_cam",
  "dms01_driver_facing",
  "adas_02_road_facing",
  "vw100ip_driver_facing_ip",
  "sd_card_1tb",
  "sd_card_2tb",
  "sd_card_480gb",
  "sd_card_256gb",
  "sd_card_512gb",
  "sd_card_250gb",
  "mic",
  "speaker",
  "mtx_mc202x",
  "mtx_corpconnect_sim_number",
  "mtx_corpconnect_data_number",
  "mtx_sim_id",
  "pfk_main_unit",
  "pfk_corpconnect_sim_number",
  "pfk_corpconnect_data_number",
  "breathaloc",
  "pfk_road_facing",
  "pfk_driver_facing",
  "pfk_dome_1",
  "pfk_dome_2",
  "pfk_5m",
  "pfk_10m",
  "pfk_15m",
  "pfk_20m",
  "roller_door_switches",
  "account_number",
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
  "mtx_mc202x_rental",
  "mtx_mc202x_sub",
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
  "additional_data",
  "driver_app",
  "total_rental",
  "total_sub",
  "total_rental_sub",
  "vehicle_validated",
]);

const NUMERIC_COLUMNS = new Set([
  "total_rental",
  "total_sub",
  "total_rental_sub",
]);

const HEADER_ALIASES: Record<string, string> = {
  company_name: "company",
  color: "colour",
  registration: "reg",
  registration_number: "reg",
  vehicle_registration: "reg",
  fleet_no: "fleet_number",
  engine_number: "engine",
  chassis: "vin",
  chassis_number: "vin",
  cost_code: "new_account_number",
  account_code: "new_account_number",
  sky_scout_12v_serial_number: "sky_scout_12v_serial_number",
  sky_scout_24v_serial_number: "sky_scout_24v_serial_number",
  skylink_voice_kit_serial_number: "skylink_voice_kit_serial_number",
  skylink_voice_kit_ip: "skylink_voice_kit_ip",
  sky_on_batt_ign_unit_serial_number: "sky_on_batt_ign_unit_serial_number",
  sky_on_batt_ign_unit_ip: "sky_on_batt_ign_unit_ip",
  skylink_trailer_unit_serial_number: "skylink_trailer_unit_serial_number",
  skylink_trailer_unit_ip: "skylink_trailer_unit_ip",
  skylink_pro_serial_number: "skylink_pro_serial_number",
  skylink_pro_ip: "skylink_pro_ip",
  skyspy: "skyspy",
  sky_scout_12v_ip: "sky_scout_12v_ip",
  sky_scout_24v_ip: "sky_scout_24v_ip",
  t_piece: "tpiece",
  t_piece_rental: "tpiece_rental",
  keypad_waterproof: "keypad_waterproof",
  fm_unit: "fm_unit",
  fm_unit_rental: "fm_unit_rental",
  fm_unit_sub: "fm_unit_sub",
  sim_card_no: "sim_card_number",
  corpconnect_sim_number: "corpconnect_sim_no",
  corpconnect_data_number: "corpconnect_data_no",
  mtx_mc202x: "mtx_mc202x",
  mtx_mc202x_rental: "mtx_mc202x_rental",
  mtx_mc202x_sub: "mtx_mc202x_sub",
  mtx_corpconnect_sim_number: "mtx_corpconnect_sim_number",
  mtx_corpconnect_data_number: "mtx_corpconnect_data_number",
  mtx_sim_id: "mtx_sim_id",
  driver_app: "driver_app",
  eps_software_development: "eps_software_development",
  maysene_software_development: "maysene_software_development",
  waterford_software_development: "waterford_software_development",
  klaver_software_development: "klaver_software_development",
  advatrans_software_development: "advatrans_software_development",
  tt_linehaul_software_development: "tt_linehaul_software_development",
  tt_express_software_development: "tt_express_software_development",
  tt_fmcg_software_development: "tt_fmcg_software_development",
  rapid_freight_software_development: "rapid_freight_software_development",
  remco_freight_software_development: "remco_freight_software_development",
  vt_logistics_software_development: "vt_logistics_software_development",
  epilite_software_development: "epilite_software_development",
  skyspy_rental: "skyspy_rental",
  skyspy_sub: "skyspy_sub",
  vw_100ip_driver_facing_ip: "vw100ip_driver_facing_ip",
  vw_100ip_driver_facing_rental: "vw100ip_driver_facing_rental",
  vw306_dvr_road_facing_for_4ch_and_8ch: "vw306_dvr_road_facing_for_4ch_8ch",
  vw306_dvr_road_facing_for_4ch_and_8ch_rental:
    "vw306_dvr_road_facing_for_4ch_8ch_rental",
  single_probe: "fuel_probe_1",
  dual_probe: "fuel_probe_2",
  single_probe_rental: "single_probe_rental",
  single_probe_sub: "single_probe_sub",
  dual_probe_rental: "dual_probe_rental",
  dual_probe_sub: "dual_probe_sub",
  "7m_harness_for_probe": "_7m_harness_for_probe",
  "7m_harness_for_probe_rental": "_7m_harness_for_probe_rental",
  "1m_extension_cable": "_1m_extension_cable",
  "1m_extension_cable_rental": "_1m_extension_cable_rental",
  "3m_extension_cable": "_3m_extension_cable",
  "3m_extension_cable_rental": "_3m_extension_cable_rental",
  "4ch_mdvr": "_4ch_mdvr",
  "4ch_mdvr_rental": "_4ch_mdvr_rental",
  "4ch_mdvr_sub": "_4ch_mdvr_sub",
  "5ch_mdvr": "_5ch_mdvr",
  "5ch_mdvr_rental": "_5ch_mdvr_rental",
  "5ch_mdvr_sub": "_5ch_mdvr_sub",
  "8ch_mdvr": "_8ch_mdvr",
  "8ch_mdvr_rental": "_8ch_mdvr_rental",
  "8ch_mdvr_sub": "_8ch_mdvr_sub",
  "5m_cable_for_camera_4pin": "_5m_cable_for_camera_4pin",
  "5m_cable_for_camera_4pin_rental": "_5m_cable_for_camera_4pin_rental",
  "5m_cable_6pin": "_5m_cable_6pin",
  "5m_cable_6pin_rental": "_5m_cable_6pin_rental",
  "10m_cable_for_camera_4pin": "_10m_cable_for_camera_4pin",
  "10m_cable_for_camera_4pin_rental": "_10m_cable_for_camera_4pin_rental",
  tag_rental_1: "tag_rental_",
  total_rental_sub: "total_rental_sub",
  total_rental_and_sub: "total_rental_sub",
};

const INSERT_BATCH_SIZE = 250;

function normalizeHeader(rawHeader: unknown) {
  const text = String(rawHeader ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return HEADER_ALIASES[text] || text;
}

function cleanCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  return String(value).trim() || null;
}

function toInsertValue(column: string, value: unknown) {
  const cleaned = cleanCellValue(value);

  if (cleaned === null) {
    return null;
  }

  if (NUMERIC_COLUMNS.has(column)) {
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return cleaned;
}

async function insertInChunks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  rows: Record<string, unknown>[],
) {
  for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + INSERT_BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const formData = await request.formData();
    const file = formData.get("file");
    const costCode = String(formData.get("cost_code") || "")
      .trim()
      .toUpperCase();
    const company = String(formData.get("company") || "").trim();

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Excel file is required" },
        { status: 400 },
      );
    }

    if (!costCode) {
      return NextResponse.json(
        { error: "cost_code is required" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return NextResponse.json(
        { error: "No worksheet found in the uploaded file" },
        { status: 400 },
      );
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      worksheet,
      {
        defval: null,
        raw: false,
      },
    );

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: "The uploaded Excel file is empty" },
        { status: 400 },
      );
    }

    const missingColumns = new Set<string>();
    const billableColumnsInFile = new Set<string>();
    const mappedRows = rawRows
      .map((row) => {
        const mapped: Record<string, unknown> = {
          new_account_number: costCode,
          account_number: costCode,
          vehicle_validated: false,
        };

        if (company) {
          mapped.company = company;
        }

        Object.entries(row).forEach(([header, value]) => {
          const normalizedHeader = normalizeHeader(header);

          if (!normalizedHeader) {
            return;
          }

          if (!VEHICLE_DB_COLUMNS.has(normalizedHeader)) {
            missingColumns.add(String(header).trim());
            return;
          }

          if (
            normalizedHeader === "new_account_number" ||
            normalizedHeader === "account_number"
          ) {
            return;
          }

          const nextValue = toInsertValue(normalizedHeader, value);
          if (nextValue !== null) {
            if (BILLABLE_VEHICLE_FIELD_SET.has(normalizedHeader)) {
              billableColumnsInFile.add(normalizedHeader);
            }
            mapped[normalizedHeader] = nextValue;
          }
        });

        return mapped;
      })
      .filter((row) =>
        Object.entries(row).some(
          ([key, value]) =>
            ![
              "new_account_number",
              "account_number",
              "vehicle_validated",
              "company",
            ].includes(key) &&
            value !== null &&
            value !== "",
        ),
      );

    if (mappedRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No usable vehicle rows were found after matching the Excel headers",
        },
        { status: 400 },
      );
    }

    if (billableColumnsInFile.size > 0 && (await isBillingLocked(supabase))) {
      return NextResponse.json(
        {
          error: "Billing is locked",
          details:
            "Vehicle imports containing rental, subscription, or billing total columns are blocked while the system is locked.",
          fields: [...billableColumnsInFile].sort(),
        },
        { status: 423 },
      );
    }

    await insertInChunks(supabase, "vehicles", mappedRows);
    await insertInChunks(supabase, "vehicles_duplicate", mappedRows);

    return NextResponse.json({
      success: true,
      inserted: mappedRows.length,
      sheetName,
      missingColumns: [...missingColumns].sort(),
    });
  } catch (error) {
    console.error("Error importing vehicles from Excel:", error);
    return NextResponse.json(
      {
        error: "Failed to import vehicles",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
