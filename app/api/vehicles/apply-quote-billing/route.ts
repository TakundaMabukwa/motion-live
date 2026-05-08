import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveVehicleProductMapping } from "@/lib/vehicle-product-mapping";
import { buildTemporaryRegistration } from "@/lib/temp-registration";

// Helper function to check if system is locked
async function isSystemLocked(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("system_locks")
    .select("is_locked")
    .eq("lock_key", "billing")
    .single();
  return data?.is_locked || false;
}

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
  "driver_app",
  "mtx_mc202x_rental",
  "mtx_mc202x_sub",
];

const BILLABLE_SET = new Set(BILLABLE_COLUMNS);
const SERVICE_ONLY_FIELDS = new Set([
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
  "driver_app",
]);
const TOTAL_FIELDS = new Set(["total_rental", "total_sub", "total_rental_sub"]);

const GROUPED_FIELD_BASES = new Set([
  "skylink_trailer_unit",
  "sky_on_batt_ign_unit",
  "skylink_voice_kit",
  "sky_scout_12v",
  "sky_scout_24v",
  "skylink_pro",
]);

const DIRECT_ALIASES: Record<string, string> = {
  skylink_trailer_unit: "skylink_trailer_unit",
  sky_on_batt_ign_unit: "sky_on_batt_ign_unit",
  starlink_onbatt: "sky_on_batt_ign_unit",
  p03onbatignaumicrosim: "sky_on_batt_ign_unit",
  skylink_voice_kit: "skylink_voice_kit",
  sky_scout_12v: "sky_scout_12v",
  sky_scout_24v: "sky_scout_24v",
  skylink_pro: "skylink_pro",
  p03starlink3g: "skylink_pro",
  skylink_motorbike: "skylink_pro",
  skylink_obd: "skylink_pro",
  p08obdsafety: "skylink_pro",
  p08scooter: "skylink_pro",
  skylite: "skylink_pro",
  skyspy: "skyspy",
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
  sms: "additional_data",
  data_number: "data_number",
  gps: "gps",
  gsm: "gsm",
  main_fm_harness: "main_fm_harness",
  beame_1: "beame_1",
  beame_2: "beame_2",
  beame_3: "beame_3",
  beame_4: "beame_4",
  beame_5: "beame_5",
  fuel_probe_1: "fuel_probe_1",
  fuel_probe_2: "fuel_probe_2",
  fm3316: "fm_unit",
  mix_4000: "fm_unit",
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
  vw400_dome_1: "vw400_dome_1",
  vw400_dome_2: "vw400_dome_2",
  vw300_dakkie_dome_1: "vw300_dakkie_dome_1",
  vw300_dakkie_dome_2: "vw300_dakkie_dome_2",
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
  pfk_dome_1: "pfk_dome_1",
  pfk_dome_2: "pfk_dome_2",
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
  tt_linehaul_software_development: "tt_linehaul_software_development",
  tt_express_software_development: "tt_express_software_development",
  tt_fmcg_software_development: "tt_fmcg_software_development",
  rapid_freight_software_development: "rapid_freight_software_development",
  remco_freight_software_development: "remco_freight_software_development",
  vt_logistics_software_development: "vt_logistics_software_development",
  epilite_software_development: "epilite_software_development",
  skyspy_rental: "skyspy_rental",
  skyspy_sub: "skyspy_sub",
};

const FAMILY_ALIAS_KEYWORDS: Record<string, string[]> = {
  beame: ["beame", "backup", "beacon", "recovery_unit", "wireless_recovery"],
  fuel_probe: ["fuel_probe", "probe"],
  vw400_dome: ["vw400_dome", "vw400"],
  vw300_dakkie_dome: ["vw300_dakkie_dome", "vw300", "dakkie_dome"],
  pfk_dome: ["pfk_dome", "pfk"],
  tag_reader: ["tag_reader", "reader"],
  tag: ["tag"],
};

const buildSlotFamilies = (fields: string[]) => {
  const grouped: Record<string, Array<{ field: string; index: number }>> = {};

  for (const field of fields) {
    const match = field.match(/^(.*)_(\d+)$/);
    if (!match) continue;
    const [, familyKey, indexText] = match;
    const index = Number(indexText);
    if (!Number.isFinite(index)) continue;
    if (!grouped[familyKey]) grouped[familyKey] = [];
    grouped[familyKey].push({ field, index });
  }

  const slotFamilies: Record<string, string[]> = {};
  for (const [familyKey, familyFields] of Object.entries(grouped)) {
    slotFamilies[familyKey] = familyFields
      .sort((a, b) => a.index - b.index)
      .map((entry) => entry.field);
  }

  if (!slotFamilies.tag) slotFamilies.tag = ["tag", "tag_"];
  if (!slotFamilies.tag_reader)
    slotFamilies.tag_reader = ["tag_reader", "tag_reader_"];

  return slotFamilies;
};

const SLOT_FAMILIES: Record<string, string[]> = buildSlotFamilies(
  Array.from(new Set(Object.values(DIRECT_ALIASES))),
);

const SPECIAL_BILLING_MAP: Record<string, { rental?: string; sub?: string }> = {
  sky_on_batt_ign_unit: {
    rental: "sky_on_batt_ign_rental",
    sub: "sky_on_batt_sub",
  },
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
  const mappedProduct = resolveVehicleProductMapping(item);
  if (mappedProduct) {
    return mappedProduct;
  }

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
  const familyKeys = Object.keys(SLOT_FAMILIES).sort(
    (a, b) => b.length - a.length,
  );

  for (const familyKey of familyKeys) {
    const keywords = [
      familyKey,
      ...(FAMILY_ALIAS_KEYWORDS[familyKey] || []),
    ].filter(Boolean);
    if (keywords.some((keyword) => joined.includes(keyword))) {
      return { kind: "family" as const, field: familyKey };
    }
  }

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
  if (special?.sub && BILLABLE_SET.has(special.sub)) return special.sub;
  if (BILLABLE_SET.has(`${field}_sub`)) return `${field}_sub`;
  if (special?.rental && BILLABLE_SET.has(special.rental))
    return special.rental;
  if (BILLABLE_SET.has(`${field}_rental`)) return `${field}_rental`;
  return null;
};

const getFamilySlotOrder = (familyKey: string, item: any, slots: string[]) => {
  if (familyKey !== "fuel_probe") {
    return slots;
  }

  const context = [
    item?.id,
    item?.item_id,
    item?.code,
    item?.item_code,
    item?.name,
    item?.product,
    item?.description,
  ]
    .map((value) => toColumnKey(String(value || "")))
    .filter(Boolean)
    .join(" ");

  const hasDualHint =
    context.includes("dual") ||
    context.includes("two_tank") ||
    context.includes("2_tank");
  const hasSingleHint =
    context.includes("single") ||
    context.includes("one_tank") ||
    context.includes("1_tank");

  if (hasDualHint && slots.includes("fuel_probe_2")) {
    return ["fuel_probe_2", ...slots.filter((slot) => slot !== "fuel_probe_2")];
  }

  if (hasSingleHint && slots.includes("fuel_probe_1")) {
    return ["fuel_probe_1", ...slots.filter((slot) => slot !== "fuel_probe_1")];
  }

  return slots;
};

const pickFamilySlotForBilling = (
  vehicle: Record<string, any>,
  item: any,
  familyKey: string,
  preferSub: boolean,
  preferRental: boolean,
  currentUpdates: Record<string, number>,
  mode: "install" | "deinstall",
) => {
  const slots = getFamilySlotOrder(
    familyKey,
    item,
    SLOT_FAMILIES[familyKey] || [],
  );
  if (!slots.length) return null;

  if (mode === "install") {
    for (const slot of slots) {
      if (String(vehicle[slot] || "").trim()) continue;
      const billingColumn = getBillingColumnForField(
        slot,
        preferSub,
        preferRental,
      );
      if (billingColumn) return billingColumn;
    }
  }

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

const getChargeAmount = (item: any, key: string) => {
  const value = Number(item?.[key]);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const getNormalizedPurchaseType = (item: any) =>
  String(item?.purchase_type || "")
    .trim()
    .toLowerCase();

const getRecurringHints = (item: any) => {
  const joined = [
    item?.id,
    item?.fieldName,
    item?.code,
    item?.item_code,
    item?.name,
    item?.product,
    item?.description,
    item?.type,
    item?.category,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .join(" ");

  return {
    hasRental: /(^|[\s_-])rental($|[\s_-])/.test(joined),
    hasSubscription:
      /(^|[\s_-])sub($|[\s_-])/.test(joined) ||
      joined.includes("subscription"),
  };
};

const getRecurringChargeSpecs = (item: any, jobType: "install" | "deinstall") => {
  const specs: Array<{ amount: number; preferSub: boolean; preferRental: boolean }> = [];
  const purchaseType = getNormalizedPurchaseType(item);
  const subscriptionAmount = getChargeAmount(item, "subscription_price");
  const rentalAmount = getChargeAmount(item, "rental_price");
  const hints = getRecurringHints(item);

  const allowSubscription =
    purchaseType === "rental" ||
    purchaseType === "subscription" ||
    !purchaseType;
  const allowRental = purchaseType === "rental" || !purchaseType;

  if (
    allowSubscription &&
    (subscriptionAmount > 0 ||
      (jobType === "deinstall" &&
        (purchaseType === "subscription" || hints.hasSubscription)))
  ) {
    specs.push({
      amount: subscriptionAmount,
      preferSub: true,
      preferRental: false,
    });
  }

  if (
    allowRental &&
    (rentalAmount > 0 ||
      (jobType === "deinstall" &&
        (purchaseType === "rental" || hints.hasRental)))
  ) {
    specs.push({
      amount: rentalAmount,
      preferSub: false,
      preferRental: true,
    });
  }

  return specs;
};

const normalizeSelectionValue = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const buildAnnuitySelectionKey = (item: any) => {
  const parts = [
    item?.id,
    item?.code,
    item?.item_code,
    item?.name,
    item?.description,
    item?.type,
    item?.category,
    item?.vehicle_plate,
    item?.vehicle_id,
    item?.rental_price,
    item?.rental_gross,
    item?.subscription_price,
    item?.subscription_gross,
    item?.quantity,
  ];

  return parts.map(normalizeSelectionValue).join("|");
};

const getOnceOffChargeSpecs = (item: any, jobType: "install" | "deinstall") => {
  const specs: Array<{ amount: number; chargeType: string }> = [];
  const purchaseType = getNormalizedPurchaseType(item);
  const mappings = [
    ["cash_price", "cash"],
    ["installation_price", "installation"],
    ["de_installation_price", "de_installation"],
    ["unit_price", "unit_price"],
    ["price", "price"],
  ] as const;

  for (const [field, chargeType] of mappings) {
    if (jobType === "install" && field === "de_installation_price") continue;
    if (jobType === "deinstall" && field === "installation_price") continue;
    if (
      field === "cash_price" &&
      purchaseType &&
      !["purchase", "cash"].includes(purchaseType)
    ) {
      continue;
    }
    const amount = getChargeAmount(item, field);
    if (amount > 0) {
      specs.push({ amount, chargeType });
    }
  }

  if (
    !specs.length &&
    getRecurringChargeSpecs(item, jobType).length === 0
  ) {
    const fallbackAmount = getChargeAmount(item, "total_price");
    if (fallbackAmount > 0) {
      specs.push({ amount: fallbackAmount, chargeType: "once_off" });
    }
  }

  return specs;
};

const parseJsonArray = (value: unknown) => {
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
};

const normalizeJobType = (value: unknown) => {
  const raw = String(value || "").toLowerCase();
  if (
    raw.includes("deinstall") ||
    raw.includes("de-install") ||
    raw.includes("decomm")
  ) {
    return "deinstall";
  }
  return "install";
};

const buildOnceOffFeeKey = (entry: Record<string, any>) => {
  return [
    entry?.job_card_id || "",
    entry?.vehicle_registration || "",
    entry?.item_code || "",
    entry?.item_name || "",
    entry?.charge_type || "",
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("|");
};

const mergeOnceOffFees = (
  existingFees: unknown,
  nextFees: Array<Record<string, any>>,
) => {
  const merged = new Map<string, Record<string, any>>();

  for (const fee of parseJsonArray(existingFees)) {
    if (!fee || typeof fee !== "object") continue;
    merged.set(buildOnceOffFeeKey(fee as Record<string, any>), {
      ...(fee as Record<string, any>),
    });
  }

  for (const fee of nextFees) {
    merged.set(buildOnceOffFeeKey(fee), fee);
  }

  return Array.from(merged.values());
};

const buildOnceOffFeeEntry = (
  item: any,
  amount: number,
  chargeType: string,
  context: {
    jobCardId: string | null;
    quotationNumber: string | null;
    invoiceNumber: string | null;
    reg: string;
    jobType: string;
  },
) => ({
  job_card_id: context.jobCardId,
  quotation_number: context.quotationNumber,
  invoice_number: context.invoiceNumber,
  vehicle_registration: context.reg,
  item_id: item?.id || null,
  item_code: item?.code || item?.item_code || null,
  item_name: item?.name || item?.description || item?.product || "Item",
  description: item?.description || item?.name || item?.product || "Item",
  quantity: Math.max(1, Number(item?.quantity) || 1),
  charge_type: chargeType,
  amount: Number(amount.toFixed(2)),
  purchase_type: item?.purchase_type || null,
  job_type: context.jobType,
  created_at: new Date().toISOString(),
});

const recalculateVehicleTotals = (vehicle: Record<string, any>) => {
  let totalRental = 0;
  let totalSub = 0;

  for (const [key, value] of Object.entries(vehicle)) {
    if (TOTAL_FIELDS.has(key)) continue;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    if (key.endsWith("_rental")) {
      totalRental += amount;
      continue;
    }

    if (key.endsWith("_sub") || SERVICE_ONLY_FIELDS.has(key)) {
      totalSub += amount;
    }
  }

  return {
    total_rental: Number(totalRental.toFixed(2)),
    total_sub: Number(totalSub.toFixed(2)),
    total_rental_sub: Number((totalRental + totalSub).toFixed(2)),
  };
};

const pickBillingColumn = (
  item: any,
  vehicle: Record<string, any>,
  currentUpdates: Record<string, any>,
  options: {
    preferSub: boolean;
    preferRental: boolean;
    mode: "install" | "deinstall";
  },
) => {
  const { preferSub, preferRental, mode } = options;

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
      item,
      mapping.field,
      preferSub,
      preferRental,
      currentUpdates,
      mode,
    );
    if (familyColumn) return familyColumn;
  }


  return null;
};

const applyQuoteBillingToTable = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    tableName,
    itemsByReg,
    costCode,
    customerName,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    jobType,
    jobCardId,
    quotationNumber,
    invoiceNumber,
    annuitySelectionKeySet,
    enforceAnnuitySelection,
  }: {
    tableName: "vehicles" | "vehicles_duplicate";
    itemsByReg: Map<string, any[]>;
    costCode: string;
    customerName: string | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: string | null;
    jobType: "install" | "deinstall";
    jobCardId: string | null;
    quotationNumber: string | null;
    invoiceNumber: string | null;
    annuitySelectionKeySet: Set<string>;
    enforceAnnuitySelection: boolean;
  },
) => {
  let created = 0;
  let updated = 0;
  const skipped: any[] = [];

  const selectColumns = "*";

  for (const [reg, itemsForReg] of itemsByReg.entries()) {
    const { data: existingRows, error: findError } = await supabase
      .from(tableName)
      .select(selectColumns)
      .ilike("reg", reg)
      .limit(20);

    if (findError) {
      throw new Error(`Failed to check ${tableName}: ${findError.message}`);
    }

    const matchingRows = Array.isArray(existingRows) ? existingRows : [];
    const existing =
      matchingRows.find((row) => {
        const rowNewAccount = String(row?.new_account_number || "").trim();
        const rowAccount = String(row?.account_number || "").trim();
        return rowNewAccount === costCode || rowAccount === costCode;
      }) || null;

    if (!existing && jobType === "deinstall") {
      skipped.push({ reason: "vehicle_not_found_for_deinstall", reg, table: tableName });
      continue;
    }

    const currentVehicle = existing || {
      reg,
      company: customerName,
      new_account_number: costCode,
      account_number: costCode,
      make: vehicleMake,
      model: vehicleModel,
      year: vehicleYear,
      once_off_fees: [],
    };

    const columnUpdates: Record<string, any> = {};
    const onceOffFees: Array<Record<string, any>> = [];
    for (const item of itemsForReg) {
      const vehicleState = { ...currentVehicle, ...columnUpdates };
      const canApplyRecurring =
        !enforceAnnuitySelection ||
        annuitySelectionKeySet.has(buildAnnuitySelectionKey(item));
      const recurringSpecs = canApplyRecurring
        ? getRecurringChargeSpecs(item, jobType)
        : [];

      for (const spec of recurringSpecs) {
        const column = pickBillingColumn(item, vehicleState, columnUpdates, {
          preferSub: spec.preferSub,
          preferRental: spec.preferRental,
          mode: jobType,
        });

        if (!column) {
          skipped.push({ reason: "no_column_match", item, reg, table: tableName });
          continue;
        }

        if (jobType === "deinstall") {
          columnUpdates[column] = 0;
          continue;
        }

        const currentColumnValue = Number(columnUpdates[column] ?? 0);
        if (Number.isFinite(currentColumnValue) && currentColumnValue > 0) {
          columnUpdates[column] = Number(
            (currentColumnValue + spec.amount).toFixed(2),
          );
        } else {
          columnUpdates[column] = spec.amount;
        }
      }

      for (const feeSpec of getOnceOffChargeSpecs(item, jobType)) {
        onceOffFees.push(
          buildOnceOffFeeEntry(item, feeSpec.amount, feeSpec.chargeType, {
            jobCardId,
            quotationNumber,
            invoiceNumber,
            reg,
            jobType,
          }),
        );
      }
    }

    const hasRecurringUpdates = Object.keys(columnUpdates).length > 0;
    const hasOnceOffUpdates = onceOffFees.length > 0;

    if (!hasRecurringUpdates && !hasOnceOffUpdates) {
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
        once_off_fees: onceOffFees,
      };

      for (const [column, value] of Object.entries(columnUpdates)) {
        insertData[column] = value;
      }

      Object.assign(insertData, recalculateVehicleTotals(insertData));

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(insertData);

      if (insertError) {
        throw new Error(`Failed to insert ${tableName} billing: ${insertError.message}`);
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
      updateData[column] = value;
    }

    if (hasOnceOffUpdates) {
      updateData.once_off_fees = mergeOnceOffFees(existing.once_off_fees, onceOffFees);
    }

    Object.assign(
      updateData,
      recalculateVehicleTotals({
        ...existing,
        ...updateData,
      }),
    );

    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Failed to update ${tableName} billing: ${updateError.message}`);
    }

    updated += 1;
  }

  return { created, updated, skipped };
};

export const applyQuoteBilling = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  body: any,
) => {
  const costCode = (body?.cost_code || "").toString().trim();
  const jobCardId = body?.job_card_id ? String(body.job_card_id) : null;
  const quotationNumber = body?.quotation_number
    ? String(body.quotation_number)
    : null;
  const invoiceNumber = body?.invoice_number ? String(body.invoice_number) : null;
  const jobType = normalizeJobType(body?.job_type);
  const quotationProducts = Array.isArray(body?.quotation_products)
    ? body.quotation_products
    : [];
  const selectedAnnuityProducts = Array.isArray(body?.selected_annuity_products)
    ? body.selected_annuity_products
    : [];
  const selectedAnnuityItemKeys = Array.isArray(body?.selected_annuity_item_keys)
    ? body.selected_annuity_item_keys
    : [];
  const hasAnnuitySelectionPayload =
    Array.isArray(body?.selected_annuity_products) ||
    Array.isArray(body?.selected_annuity_item_keys);
  const annuitySelectionKeySet = new Set<string>();
  for (const item of selectedAnnuityProducts) {
    annuitySelectionKeySet.add(buildAnnuitySelectionKey(item));
  }
  for (const key of selectedAnnuityItemKeys) {
    const normalized = normalizeSelectionValue(key);
    if (normalized) {
      annuitySelectionKeySet.add(normalized);
    }
  }
  const fallbackReg = (
    body?.vehicle_registration ||
    body?.temporary_registration ||
    ""
  )
    .toString()
    .trim();
  const effectiveFallbackReg =
    fallbackReg ||
    buildTemporaryRegistration(
      jobCardId,
      body?.job_number,
      quotationNumber,
      costCode,
    );
  const customerName = body?.customer_name || null;
  const vehicleMake = body?.vehicle_make || null;
  const vehicleModel = body?.vehicle_model || null;
  const vehicleYear = body?.vehicle_year || null;

  if (!costCode) {
    throw new Error("cost_code is required");
  }

  if (quotationProducts.length === 0) {
    return {
      success: true,
      message: "No quotation products provided",
      created: 0,
      updated: 0,
      skipped: [],
      mode: jobType,
    };
  }

  const itemsByReg = new Map<string, any[]>();
  const skipped: any[] = [];

  for (const item of quotationProducts) {
    const recurringSpecs = getRecurringChargeSpecs(item, jobType);
    const onceOffSpecs = getOnceOffChargeSpecs(item, jobType);
    if (!recurringSpecs.length && !onceOffSpecs.length) {
      skipped.push({ reason: "no_billing_effect", item });
      continue;
    }

    const reg = (item?.vehicle_plate || effectiveFallbackReg || "")
      .toString()
      .trim();

    if (!itemsByReg.has(reg)) {
      itemsByReg.set(reg, []);
    }
    itemsByReg.get(reg)!.push(item);
  }

  let created = 0;
  let updated = 0;
  const primaryResult = await applyQuoteBillingToTable(supabase, {
    tableName: "vehicles",
    itemsByReg,
    costCode,
    customerName,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    jobType,
    jobCardId,
    quotationNumber,
    invoiceNumber,
    annuitySelectionKeySet,
    enforceAnnuitySelection: hasAnnuitySelectionPayload,
  });
  created = primaryResult.created;
  updated = primaryResult.updated;
  skipped.push(...primaryResult.skipped);

  const mirrorResult = await applyQuoteBillingToTable(supabase, {
    tableName: "vehicles_duplicate",
    itemsByReg,
    costCode,
    customerName,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    jobType,
    jobCardId,
    quotationNumber,
    invoiceNumber,
    annuitySelectionKeySet,
    enforceAnnuitySelection: hasAnnuitySelectionPayload,
  });
  skipped.push(...mirrorResult.skipped);

  return {
    success: true,
    cost_code: costCode,
    mode: jobType,
    created,
    updated,
    mirror_created: mirrorResult.created,
    mirror_updated: mirrorResult.updated,
    skipped,
  };
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
    if (await isSystemLocked(supabase)) {
      const { data: lockRow } = await supabase
        .from("system_locks")
        .select("*")
        .eq("lock_key", "billing")
        .single();

      const queuedReg = String(
        body?.vehicle_registration || body?.temporary_registration || "",
      ).trim() || null;

      const { data: queuedRow, error: queueError } = await supabase
        .from("vehicle_billing_queue")
        .insert({
          job_card_id: body?.job_card_id || null,
          cost_code: body?.cost_code || null,
          vehicle_reg: queuedReg,
          action_type: "apply_quote_billing",
          payload: body || {},
          lock_date: lockRow?.lock_date || null,
          queued_by: user.id,
          queued_at: new Date().toISOString(),
          status: "pending",
        })
        .select("*")
        .single();

      if (queueError) {
        return NextResponse.json(
          {
            error: "Failed to queue vehicle billing update",
            details: queueError.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        queued: true,
        applied: false,
        queue: queuedRow,
        message:
          "Billing is locked. Quote billing changes were queued and will be applied after unlock.",
      });
    }

    const result = await applyQuoteBilling(supabase, body);
    return NextResponse.json(result);
  } catch (error: any) {
    const errorMessage = error?.message || "Unknown error";
    const status = /required/i.test(errorMessage) ? 400 : 500;
    return NextResponse.json(
      {
        error: "Internal server error",
        details: errorMessage,
      },
      { status },
    );
  }
}
