import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type VehicleRow = Record<string, any>;
type EquipmentItem = Record<string, any>;

const GROUPED_FIELD_BASES = new Set([
  "skylink_trailer_unit",
  "sky_on_batt_ign_unit",
  "skylink_voice_kit",
  "sky_scout_12v",
  "sky_scout_24v",
  "skylink_pro",
]);

const SLOT_FAMILIES: Record<string, string[]> = {
  beame: ["beame_1", "beame_2", "beame_3", "beame_4", "beame_5"],
  fuel_probe: ["fuel_probe_1", "fuel_probe_2"],
  vw400_dome: ["vw400_dome_1", "vw400_dome_2"],
  vw300_dakkie_dome: ["vw300_dakkie_dome_1", "vw300_dakkie_dome_2"],
  pfk_dome: ["pfk_dome_1", "pfk_dome_2"],
  tag: ["tag", "tag_"],
  tag_reader: ["tag_reader", "tag_reader_"],
};

const DIRECT_ALIASES: Record<string, string> = {
  skylink_trailer_unit: "skylink_trailer_unit",
  sky_on_batt_ign_unit: "sky_on_batt_ign_unit",
  skylink_voice_kit: "skylink_voice_kit",
  sky_scout_12v: "sky_scout_12v",
  sky_scout_24v: "sky_scout_24v",
  skylink_pro: "skylink_pro",
  skylink_sim_card_no: "skylink_sim_card_no",
  skylink_data_number: "skylink_data_number",
  sky_safety: "sky_safety",
  sky_idata: "sky_idata",
  sky_ican: "sky_ican",
  industrial_panic: "industrial_panic",
  flat_panic: "flat_panic",
  buzzer: "buzzer",
  tag: "tag",
  tag_reader: "tag_reader",
  keypad: "keypad",
  keypad_waterproof: "keypad_waterproof",
  early_warning: "early_warning",
  cia: "cia",
  fm_unit: "fm_unit",
  sim_card_number: "sim_card_number",
  data_number: "data_number",
  gps: "gps",
  gsm: "gsm",
  main_fm_harness: "main_fm_harness",
  tpiece: "tpiece",
  idata: "idata",
  _7m_harness_for_probe: "_7m_harness_for_probe",
  _1m_extension_cable: "_1m_extension_cable",
  _3m_extension_cable: "_3m_extension_cable",
  _4ch_mdvr: "_4ch_mdvr",
  _5ch_mdvr: "_5ch_mdvr",
  _8ch_mdvr: "_8ch_mdvr",
  a2_dash_cam: "a2_dash_cam",
  a3_dash_cam_ai: "a3_dash_cam_ai",
  corpconnect_sim_no: "corpconnect_sim_no",
  corpconnect_data_no: "corpconnect_data_no",
  sim_id: "sim_id",
  _5m_cable_for_camera_4pin: "_5m_cable_for_camera_4pin",
  _5m_cable_6pin: "_5m_cable_6pin",
  _10m_cable_for_camera_4pin: "_10m_cable_for_camera_4pin",
  a2_mec_5: "a2_mec_5",
  vw502_dual_lens_camera: "vw502_dual_lens_camera",
  vw303_driver_facing_camera: "vw303_driver_facing_camera",
  vw502f_road_facing_camera: "vw502f_road_facing_camera",
  vw306_dvr_road_facing_for_4ch_8ch: "vw306_dvr_road_facing_for_4ch_8ch",
  vw306m_a2_dash_cam: "vw306m_a2_dash_cam",
  dms01_driver_facing: "dms01_driver_facing",
  adas_02_road_facing: "adas_02_road_facing",
  vw100ip_driver_facing_ip: "vw100ip_driver_facing_ip",
  sd_card_1tb: "sd_card_1tb",
  sd_card_2tb: "sd_card_2tb",
  sd_card_480gb: "sd_card_480gb",
  sd_card_256gb: "sd_card_256gb",
  sd_card_512gb: "sd_card_512gb",
  sd_card_250gb: "sd_card_250gb",
  mic: "mic",
  speaker: "speaker",
  pfk_main_unit: "pfk_main_unit",
  pfk_corpconnect_sim_number: "pfk_corpconnect_sim_number",
  pfk_corpconnect_data_number: "pfk_corpconnect_data_number",
  breathaloc: "breathaloc",
  pfk_road_facing: "pfk_road_facing",
  pfk_driver_facing: "pfk_driver_facing",
  pfk_5m: "pfk_5m",
  pfk_10m: "pfk_10m",
  pfk_15m: "pfk_15m",
  pfk_20m: "pfk_20m",
  roller_door_switches: "roller_door_switches",
  mtx_mc202x: "mtx_mc202x",
  mtx_corpconnect_sim_number: "mtx_corpconnect_sim_number",
  mtx_corpconnect_data_number: "mtx_corpconnect_data_number",
  mtx_sim_id: "mtx_sim_id",
  driver_app: "driver_app",
  eps_software_development: "eps_software_development",
  maysene_software_development: "maysene_software_development",
  waterford_software_development: "waterford_software_development",
  klaver_software_development: "klaver_software_development",
  advatrans_software_development: "advatrans_software_development",
};

const GROUPED_SEARCH_FIELDS = Array.from(GROUPED_FIELD_BASES).flatMap(
  (base) => [`${base}_serial_number`, `${base}_ip`],
);

const DIRECT_SEARCH_FIELDS = Array.from(
  new Set([
    ...Object.values(DIRECT_ALIASES),
    ...Object.values(SLOT_FAMILIES).flat(),
  ]),
);

function resolveKnownFieldName(field: string) {
  if (!field) return null;
  if (DIRECT_ALIASES[field]) {
    return { kind: "direct" as const, field: DIRECT_ALIASES[field] };
  }
  if (GROUPED_FIELD_BASES.has(field)) {
    return { kind: "grouped" as const, field };
  }
  if (field.endsWith("_serial_number")) {
    const base = field.slice(0, -"_serial_number".length);
    if (GROUPED_FIELD_BASES.has(base)) {
      return { kind: "grouped" as const, field: base };
    }
  }
  if (field.endsWith("_ip")) {
    const base = field.slice(0, -"_ip".length);
    if (GROUPED_FIELD_BASES.has(base)) {
      return { kind: "grouped" as const, field: base };
    }
  }
  if (DIRECT_SEARCH_FIELDS.includes(field)) {
    return { kind: "direct" as const, field };
  }
  return null;
}

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function parseArray(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getUniqueEquipmentValue(item: EquipmentItem) {
  const description = String(item?.description || "").trim();
  const descriptionSerial =
    description.match(
      /(?:s\/n|serial(?: number)?)\s*[:#-]?\s*([a-z0-9._/-]+)/i,
    )?.[1] || "";
  const descriptionIp =
    description.match(/(?:\bip\b|ip address)\s*[:#-]?\s*([0-9.]+)/i)?.[1] || "";

  const serial = String(
    item?.serial_number ||
      item?.serial ||
      item?.item_serial ||
      descriptionSerial ||
      "",
  ).trim();
  const ip = String(item?.ip_address || item?.ip || descriptionIp || "").trim();
  const value = String(item?.value || "").trim();
  return {
    serial: serial || null,
    ip: ip || null,
    text: serial || ip || value || null,
  };
}

function findFieldByExistingValue(
  vehicle: VehicleRow,
  values: ReturnType<typeof getUniqueEquipmentValue>,
) {
  const targets = [values.serial, values.ip, values.text]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  if (!targets.length) return null;

  for (const field of GROUPED_SEARCH_FIELDS) {
    const current = String(vehicle[field] || "")
      .trim()
      .toLowerCase();
    if (!current || !targets.includes(current)) continue;
    if (field.endsWith("_serial_number")) {
      return {
        kind: "grouped" as const,
        field: field.slice(0, -"_serial_number".length),
      };
    }
    if (field.endsWith("_ip")) {
      return {
        kind: "grouped" as const,
        field: field.slice(0, -"_ip".length),
      };
    }
  }

  for (const field of DIRECT_SEARCH_FIELDS) {
    const current = String(vehicle[field] || "")
      .trim()
      .toLowerCase();
    if (current && targets.includes(current)) {
      return { kind: "direct" as const, field };
    }
  }

  return null;
}

function getVehicleRegs(job: Record<string, any>) {
  const regs = new Set<string>();
  const fallback = String(job?.vehicle_registration || "").trim();
  if (fallback) regs.add(fallback);

  for (const product of parseArray(job?.quotation_products)) {
    const reg = String(product?.vehicle_plate || "").trim();
    if (reg) regs.add(reg);
  }

  return Array.from(regs);
}

function resolveField(item: EquipmentItem) {
  const directField = normalize(item?.fieldName);
  const knownField = resolveKnownFieldName(directField);
  if (knownField) {
    return knownField;
  }

  const candidates = [
    item?.code,
    item?.item_code,
    item?.name,
    item?.product,
    item?.description,
    item?.type,
    item?.category,
  ]
    .map(normalize)
    .filter(Boolean);

  for (const candidate of candidates) {
    if (DIRECT_ALIASES[candidate]) {
      return { kind: "direct" as const, field: DIRECT_ALIASES[candidate] };
    }
    if (GROUPED_FIELD_BASES.has(candidate)) {
      return { kind: "grouped" as const, field: candidate };
    }
  }

  const joined = candidates.join(" ");
  if (joined.includes("beame"))
    return { kind: "family" as const, field: "beame" };
  if (joined.includes("fuel_probe") || joined.includes("probe"))
    return { kind: "family" as const, field: "fuel_probe" };
  if (joined.includes("vw400") && joined.includes("dome"))
    return { kind: "family" as const, field: "vw400_dome" };
  if (
    joined.includes("vw300") &&
    joined.includes("dakkie") &&
    joined.includes("dome")
  )
    return { kind: "family" as const, field: "vw300_dakkie_dome" };
  if (joined.includes("pfk") && joined.includes("dome"))
    return { kind: "family" as const, field: "pfk_dome" };
  if (joined.includes("tag_reader"))
    return { kind: "family" as const, field: "tag_reader" };
  if (joined.includes("tag")) return { kind: "family" as const, field: "tag" };

  return null;
}

function pickInstallSlot(
  vehicle: VehicleRow,
  familyKey: string,
  desiredValue: string | null,
) {
  const slots = SLOT_FAMILIES[familyKey] || [];
  if (!slots.length) return null;
  if (desiredValue) {
    const existingMatch = slots.find(
      (slot) => String(vehicle[slot] || "").trim() === desiredValue,
    );
    if (existingMatch) return existingMatch;
  }
  return slots.find((slot) => !String(vehicle[slot] || "").trim()) || null;
}

function pickDeinstallSlot(
  vehicle: VehicleRow,
  familyKey: string,
  desiredValue: string | null,
) {
  const slots = SLOT_FAMILIES[familyKey] || [];
  if (!slots.length) return null;
  if (desiredValue) {
    const existingMatch = slots.find(
      (slot) => String(vehicle[slot] || "").trim() === desiredValue,
    );
    if (existingMatch) return existingMatch;
  }
  return slots.find((slot) => String(vehicle[slot] || "").trim()) || null;
}

function buildVehicleUpdate(
  jobType: string,
  vehicle: VehicleRow,
  item: EquipmentItem,
) {
  const values = getUniqueEquipmentValue(item);
  const mapping =
    findFieldByExistingValue(vehicle, values) || resolveField(item);
  if (!mapping) {
    return {
      update: null,
      warning: `No vehicle field match for item "${item?.name || item?.description || item?.code || "Unknown"}"`,
    };
  }

  if (mapping.kind === "grouped") {
    const serialField = `${mapping.field}_serial_number`;
    const ipField = `${mapping.field}_ip`;
    if (jobType === "install") {
      const update: Record<string, any> = {};
      if (values.serial) update[serialField] = values.serial;
      if (values.ip) update[ipField] = values.ip;
      if (!Object.keys(update).length && values.text)
        update[serialField] = values.text;
      return Object.keys(update).length
        ? { update, warning: null }
        : {
            update: null,
            warning: `No serial or IP found for ${mapping.field}`,
          };
    }
    return { update: { [serialField]: null, [ipField]: null }, warning: null };
  }

  if (mapping.kind === "family") {
    const targetField =
      jobType === "install"
        ? pickInstallSlot(vehicle, mapping.field, values.text)
        : pickDeinstallSlot(vehicle, mapping.field, values.text);

    if (!targetField) {
      return {
        update: null,
        warning:
          jobType === "install"
            ? `No empty slot available for ${mapping.field}`
            : `No installed slot found to clear for ${mapping.field}`,
      };
    }

    return {
      update: { [targetField]: jobType === "install" ? values.text : null },
      warning:
        values.text || jobType === "deinstall"
          ? null
          : `No unique value found for ${mapping.field}`,
    };
  }

  if (jobType === "install") {
    const nextValue = values.text;
    if (!nextValue) {
      return {
        update: null,
        warning: `No unique value found for ${mapping.field}`,
      };
    }

    const currentValue = String(vehicle[mapping.field] || "").trim();
    if (currentValue && currentValue !== nextValue) {
      return {
        update: null,
        warning: `${mapping.field} already has a value on ${vehicle.reg || vehicle.fleet_number || vehicle.id}`,
      };
    }

    return { update: { [mapping.field]: nextValue }, warning: null };
  }

  return { update: { [mapping.field]: null }, warning: null };
}

async function getVehiclesForJob(supabase: any, job: Record<string, any>) {
  const regs = getVehicleRegs(job);
  if (!regs.length) return [];

  const costCode = String(job?.new_account_number || "").trim();
  const regFilters = regs.map((reg) => `reg.ilike.${reg}`);
  const orCondition = regFilters.join(",");

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .or(orCondition);
  if (error) throw new Error(error.message);

  const rows = Array.isArray(data) ? data : [];
  if (!costCode) return rows;

  return rows.filter((row) => {
    const rowNewAccount = String(row?.new_account_number || "").trim();
    const rowAccount = String(row?.account_number || "").trim();
    return rowNewAccount === costCode || rowAccount === costCode;
  });
}

async function createVehicleForJob(supabase: any, job: Record<string, any>) {
  const regs = getVehicleRegs(job);
  const reg = String(regs[0] || job?.vehicle_registration || "").trim();
  const costCode = String(job?.new_account_number || "").trim();

  if (!reg) {
    throw new Error("Vehicle registration is required to create a vehicle row");
  }

  const insertData = {
    company: job?.customer_name || null,
    new_account_number: costCode || null,
    account_number: costCode || null,
    reg,
    make: job?.vehicle_make || null,
    model: job?.vehicle_model || null,
    year: job?.vehicle_year || null,
    vin: job?.vin_numer || null,
    colour: null,
    branch: null,
    fleet_number: null,
    engine: null,
    total_rental: 0,
    total_sub: Number(job?.quotation_total_amount || 0) || 0,
    total_rental_sub: Number(job?.quotation_total_amount || 0) || 0,
    vehicle_validated: false,
  };

  const { data, error } = await supabase
    .from("vehicles")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

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

    const body = await request.json();
    const job = body?.job && typeof body.job === "object" ? body.job : null;
    if (!job?.id) {
      return NextResponse.json({ error: "job is required" }, { status: 400 });
    }

    const jobTypeRaw = String(
      job?.job_type || job?.quotation_job_type || "",
    ).toLowerCase();
    const jobType =
      jobTypeRaw.includes("deinstall") ||
      jobTypeRaw.includes("de-install") ||
      jobTypeRaw.includes("decomm")
        ? "deinstall"
        : "install";

    let createdVehicleId: number | null = null;
    let vehicles = await getVehiclesForJob(supabase, job);
    if (!vehicles.length && jobType === "install") {
      const createdVehicle = await createVehicleForJob(supabase, job);
      createdVehicleId = createdVehicle?.id ?? null;
      vehicles = [createdVehicle];
    }

    if (!vehicles.length) {
      return NextResponse.json(
        { error: "No matching vehicle rows found in vehicles" },
        { status: 404 },
      );
    }

    const sourceItems =
      jobType === "install"
        ? [
            ...parseArray(job?.equipment_used),
            ...parseArray(job?.parts_required),
          ]
        : [
            ...parseArray(job?.quotation_products),
            ...parseArray(job?.equipment_used),
            ...parseArray(job?.parts_required),
          ];

    if (!sourceItems.length) {
      return NextResponse.json({
        success: true,
        updated: 0,
        warnings: ["No equipment items found on job card"],
        mode: jobType,
      });
    }

    let updated = 0;
    const warnings: string[] = [];

    for (const vehicle of vehicles) {
      const updateData: Record<string, any> = {};

      for (const item of sourceItems) {
        const itemVehiclePlate = String(item?.vehicle_plate || "").trim();
        if (
          itemVehiclePlate &&
          String(vehicle.reg || "").trim() &&
          itemVehiclePlate.toLowerCase() !==
            String(vehicle.reg || "")
              .trim()
              .toLowerCase()
        ) {
          continue;
        }

        const { update, warning } = buildVehicleUpdate(
          jobType,
          { ...vehicle, ...updateData },
          item,
        );
        if (warning)
          warnings.push(
            `${vehicle.reg || vehicle.fleet_number || vehicle.id}: ${warning}`,
          );
        if (update) {
          Object.assign(updateData, update);
        }
      }

      if (!Object.keys(updateData).length) {
        continue;
      }

      const { error: updateError } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", vehicle.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      updated += 1;
    }

    return NextResponse.json({
      success: true,
      mode: jobType,
      updated,
      warnings,
      createdVehicleId,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to sync job equipment to vehicles",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
