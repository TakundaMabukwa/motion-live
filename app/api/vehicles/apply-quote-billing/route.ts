import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveVehicleProductMapping } from "@/lib/vehicle-product-mapping";
import { buildTemporaryRegistration } from "@/lib/temp-registration";

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
const SERVICE_ONLY_FIELDS = new Set([
  "consultancy",
  "roaming",
  "maintenance",
  "after_hours",
  "controlroom",
  "software",
  "additional_data",
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

const pickFamilySlotForBilling = (
  vehicle: Record<string, any>,
  familyKey: string,
  preferSub: boolean,
  preferRental: boolean,
  currentUpdates: Record<string, number>,
  mode: "install" | "deinstall",
) => {
  const slots = SLOT_FAMILIES[familyKey] || [];
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
    allowFallbackTotals?: boolean;
    mode: "install" | "deinstall";
  },
) => {
  const { preferSub, preferRental, allowFallbackTotals = false, mode } = options;

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
      mode,
    );
    if (familyColumn) return familyColumn;
  }

  if (allowFallbackTotals && preferSub && BILLABLE_SET.has("total_sub")) {
    return "total_sub";
  }

  if (allowFallbackTotals && preferRental && BILLABLE_SET.has("total_rental")) {
    return "total_rental";
  }

  return null;
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
    const jobCardId = body?.job_card_id ? String(body.job_card_id) : null;
    const quotationNumber = body?.quotation_number
      ? String(body.quotation_number)
      : null;
    const invoiceNumber = body?.invoice_number ? String(body.invoice_number) : null;
    const jobType = normalizeJobType(body?.job_type);
    const quotationProducts = Array.isArray(body?.quotation_products)
      ? body.quotation_products
      : [];
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
        mode: jobType,
      });
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

    const selectColumns = "*";

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

      if (!existing && jobType === "deinstall") {
        skipped.push({ reason: "vehicle_not_found_for_deinstall", reg });
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
        const recurringSpecs = getRecurringChargeSpecs(item, jobType);

        for (const spec of recurringSpecs) {
          const column = pickBillingColumn(item, vehicleState, columnUpdates, {
            preferSub: spec.preferSub,
            preferRental: spec.preferRental,
            allowFallbackTotals: true,
            mode: jobType,
          });

          if (!column) {
            skipped.push({ reason: "no_column_match", item, reg });
            continue;
          }

          columnUpdates[column] = jobType === "deinstall" ? 0 : spec.amount;
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
      mode: jobType,
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
