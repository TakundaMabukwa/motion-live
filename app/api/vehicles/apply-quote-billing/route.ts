import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BILLABLE_COLUMNS = [
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
  "total_rental_sub",
  "total_rental",
  "total_sub",
  "software",
  "additional_data",
];

const BILLABLE_SET = new Set(BILLABLE_COLUMNS);

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
  consultancy: "consultancy",
  roaming: "roaming",
  maintenance: "maintenance",
  after_hours: "after_hours",
  controlroom: "controlroom",
  software: "software",
  additional_data: "additional_data",
  mtx_mc202x: "mtx_mc202x",
  driver_app: "driver_app",
  eps_software_development: "eps_software_development",
  maysene_software_development: "maysene_software_development",
  waterford_software_development: "waterford_software_development",
  klaver_software_development: "klaver_software_development",
  advatrans_software_development: "advatrans_software_development",
};

const SPECIAL_BILLING_MAP: Record<string, { rental?: string; sub?: string }> = {
  fuel_probe_1: { rental: "single_probe_rental", sub: "single_probe_sub" },
  fuel_probe_2: { rental: "dual_probe_rental", sub: "dual_probe_sub" },
  tag: { rental: "tag_rental" },
  tag_: { rental: "tag_rental_" },
  tag_reader: { rental: "tag_reader_rental" },
  tag_reader_: { rental: "tag_reader_rental_" },
};

const KNOWN_DIRECT_FIELDS = Array.from(
  new Set([
    ...Object.values(DIRECT_ALIASES),
    ...Object.values(SLOT_FAMILIES).flat(),
  ]),
);

const toColumnKey = (value: string) => {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const getUniqueEquipmentValue = (item: any) => {
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

  return {
    serial: serial || null,
    ip: ip || null,
    text: serial || ip || null,
  };
};

const resolveKnownFieldName = (field: string) => {
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
  if (KNOWN_DIRECT_FIELDS.includes(field)) {
    return { kind: "direct" as const, field };
  }
  return null;
};

const resolveField = (item: any) => {
  const directField = item?.fieldName
    ? toColumnKey(String(item.fieldName))
    : "";
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
    .map((value) => (value ? toColumnKey(String(value)) : ""))
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
};

const findFieldByExistingValue = (vehicle: Record<string, any>, item: any) => {
  const values = getUniqueEquipmentValue(item);
  const targets = [values.serial, values.ip, values.text]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  if (!targets.length) return null;

  for (const base of GROUPED_FIELD_BASES) {
    const serialField = `${base}_serial_number`;
    const ipField = `${base}_ip`;
    const serialValue = String(vehicle[serialField] || "")
      .trim()
      .toLowerCase();
    const ipValue = String(vehicle[ipField] || "")
      .trim()
      .toLowerCase();
    if (
      (serialValue && targets.includes(serialValue)) ||
      (ipValue && targets.includes(ipValue))
    ) {
      return { kind: "grouped" as const, field: base };
    }
  }

  for (const field of KNOWN_DIRECT_FIELDS) {
    const current = String(vehicle[field] || "")
      .trim()
      .toLowerCase();
    if (current && targets.includes(current)) {
      return { kind: "direct" as const, field };
    }
  }

  return null;
};

const getBillingColumnForField = (
  field: string,
  preferSub: boolean,
  preferRental: boolean,
) => {
  const special = SPECIAL_BILLING_MAP[field];
  if (preferSub && special?.sub && BILLABLE_SET.has(special.sub))
    return special.sub;
  if (preferRental && special?.rental && BILLABLE_SET.has(special.rental))
    return special.rental;
  if (BILLABLE_SET.has(field)) return field;
  if (preferSub && BILLABLE_SET.has(`${field}_sub`)) return `${field}_sub`;
  if (preferRental && BILLABLE_SET.has(`${field}_rental`))
    return `${field}_rental`;
  return null;
};

const pickFamilySlotForBilling = (
  vehicle: Record<string, any>,
  familyKey: string,
  preferSub: boolean,
  preferRental: boolean,
  currentUpdates: Record<string, number>,
) => {
  const slots = SLOT_FAMILIES[familyKey] || [];
  if (!slots.length) return null;

  for (const slot of slots) {
    if (!String(vehicle[slot] || "").trim()) continue;
    const billingColumn = getBillingColumnForField(
      slot,
      preferSub,
      preferRental,
    );
    if (!billingColumn) continue;
    const existingBilling = Number(
      currentUpdates[billingColumn] ?? vehicle[billingColumn] ?? 0,
    );
    if (existingBilling <= 0) return billingColumn;
  }

  for (const slot of slots) {
    if (!String(vehicle[slot] || "").trim()) continue;
    const billingColumn = getBillingColumnForField(
      slot,
      preferSub,
      preferRental,
    );
    if (billingColumn) return billingColumn;
  }

  return null;
};

const getItemAmount = (item: any) => {
  const candidates = [
    item?.subscription_price,
    item?.rental_price,
    item?.cash_price,
    item?.total_price,
  ];
  for (const value of candidates) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
};

const pickBillingColumn = (
  item: any,
  vehicle: Record<string, any>,
  currentUpdates: Record<string, number>,
) => {
  const amount = getItemAmount(item);
  const preferSub =
    Number(item?.subscription_price || 0) > 0 ||
    String(item?.purchase_type || "").toLowerCase() === "subscription";
  const preferRental =
    Number(item?.rental_price || 0) > 0 ||
    String(item?.purchase_type || "").toLowerCase() === "rental";

  const matchedByValue = findFieldByExistingValue(vehicle, item);
  if (matchedByValue) {
    const billingColumn = getBillingColumnForField(
      matchedByValue.field,
      preferSub,
      preferRental,
    );
    if (billingColumn) return billingColumn;
  }

  const mapping = resolveField(item);
  if (mapping?.kind === "direct" || mapping?.kind === "grouped") {
    const billingColumn = getBillingColumnForField(
      mapping.field,
      preferSub,
      preferRental,
    );
    if (billingColumn) return billingColumn;
  }

  if (mapping?.kind === "family") {
    const familyColumn = pickFamilySlotForBilling(
      vehicle,
      mapping.field,
      preferSub,
      preferRental,
      currentUpdates,
    );
    if (familyColumn) return familyColumn;
  }

  // If nothing matched but amount exists, do not guess.
  return amount > 0 ? null : null;
};

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
    const costCode = (body?.cost_code || "").toString().trim();
    const quotationProducts = Array.isArray(body?.quotation_products)
      ? body.quotation_products
      : [];
    const fallbackReg = (body?.vehicle_registration || "").toString().trim();
    const customerName = body?.customer_name || null;
    const vehicleMake = body?.vehicle_make || null;
    const vehicleModel = body?.vehicle_model || null;
    const vehicleYear = body?.vehicle_year || null;

    if (!costCode) {
      return NextResponse.json(
        { error: "cost_code is required" },
        { status: 400 },
      );
    }

    if (quotationProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No quotation products provided",
        created: 0,
        updated: 0,
        skipped: 0,
      });
    }

    const itemsByReg = new Map<string, any[]>();
    const skipped: any[] = [];

    for (const item of quotationProducts) {
      const amount = getItemAmount(item);
      if (amount <= 0) {
        skipped.push({ reason: "no_amount", item });
        continue;
      }

      const reg = (item?.vehicle_plate || fallbackReg || "").toString().trim();
      if (!reg) {
        skipped.push({ reason: "no_reg", item });
        continue;
      }

      if (!itemsByReg.has(reg)) {
        itemsByReg.set(reg, []);
      }
      itemsByReg.get(reg)!.push(item);
    }

    let created = 0;
    let updated = 0;

    const selectColumns = [
      "id",
      "reg",
      "fleet_number",
      "new_account_number",
      "account_number",
      ...BILLABLE_COLUMNS,
    ].join(", ");

    for (const [reg, itemsForReg] of itemsByReg.entries()) {
      const { data: existingRows, error: findError } = await supabase
        .from("vehicles")
        .select(selectColumns)
        .ilike("reg", reg)
        .limit(20);

      if (findError) {
        return NextResponse.json(
          { error: "Failed to check vehicles", details: findError.message },
          { status: 500 },
        );
      }

      const matchingRows = Array.isArray(existingRows) ? existingRows : [];
      const existing =
        matchingRows.find((row) => {
          const rowNewAccount = String(row?.new_account_number || "").trim();
          const rowAccount = String(row?.account_number || "").trim();
          return rowNewAccount === costCode || rowAccount === costCode;
        }) || null;

      const columnUpdates: Record<string, number> = {};
      for (const item of itemsForReg) {
        const amount = getItemAmount(item);
        const sourceVehicle = existing || {};
        const column = pickBillingColumn(
          item,
          { ...sourceVehicle, ...columnUpdates },
          columnUpdates,
        );
        if (!column) {
          skipped.push({ reason: "no_column_match", item, reg });
          continue;
        }
        columnUpdates[column] = (columnUpdates[column] || 0) + amount;
      }

      if (!Object.keys(columnUpdates).length) {
        continue;
      }

      if (!existing) {
        const insertData: Record<string, any> = {
          reg,
          company: customerName,
          new_account_number: costCode,
          account_number: costCode,
          make: vehicleMake,
          model: vehicleModel,
          year: vehicleYear,
        };

        for (const [column, value] of Object.entries(columnUpdates)) {
          insertData[column] = value;
        }

        const { error: insertError } = await supabase
          .from("vehicles")
          .insert(insertData);

        if (insertError) {
          return NextResponse.json(
            {
              error: "Failed to insert vehicle billing",
              details: insertError.message,
            },
            { status: 500 },
          );
        }

        created += 1;
        continue;
      }

      const updateData: Record<string, any> = {};
      if (!existing.new_account_number) {
        updateData.new_account_number = costCode;
      }
      if (!existing.account_number) {
        updateData.account_number = costCode;
      }
      for (const [column, value] of Object.entries(columnUpdates)) {
        const current = Number(existing[column] || 0);
        updateData[column] = current + value;
      }

      const { error: updateError } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json(
          {
            error: "Failed to update vehicle billing",
            details: updateError.message,
          },
          { status: 500 },
        );
      }

      updated += 1;
    }

    return NextResponse.json({
      success: true,
      cost_code: costCode,
      created,
      updated,
      skipped,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
