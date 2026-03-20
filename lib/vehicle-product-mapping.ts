export type VehicleMappingKind = "direct" | "grouped" | "family";

export type VehicleProductMapping = {
  kind: VehicleMappingKind;
  field: string;
};

type ProductMappingRule = VehicleProductMapping & {
  aliases: string[];
  type?: string[];
  category?: string[];
};

type ProductLike = Record<string, unknown>;

export function normalizeVehicleProductText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function asArray(values?: string[]) {
  return (values || []).map(normalizeVehicleProductText).filter(Boolean);
}

const PRODUCT_MAPPING_RULES: ProductMappingRule[] = [
  { kind: "grouped", field: "skylink_pro", aliases: ["skylink_pro", "skylink_pro_2g_3g_4g", "starlink_pro"], type: ["fms"], category: ["fms"] },
  { kind: "grouped", field: "skylink_trailer_unit", aliases: ["skylink_asset_trailer", "skylink_asset", "trailer_unit", "ituran_starlink_4g_au"], type: ["fms"], category: ["fms"] },
  { kind: "grouped", field: "sky_scout_12v", aliases: ["skylink_scout_12v", "scout_12v"], type: ["fms"], category: ["fms"] },
  { kind: "grouped", field: "sky_scout_24v", aliases: ["skylink_scout_24v", "scout_24v"], type: ["fms"], category: ["fms"] },
  { kind: "family", field: "beame", aliases: ["beame_backup_unit", "beame_beacon", "wireless_recovery_unit", "wireless_recovery_unit_only", "backup_unit", "beacon"], category: ["backup"] },
  { kind: "direct", field: "sky_safety", aliases: ["sky_safety"], category: ["module"] },
  { kind: "direct", field: "sky_ican", aliases: ["sky_can", "canbus_integration"], category: ["module"] },
  { kind: "direct", field: "keypad", aliases: ["driver_id_keypad", "keypad_driver_id"], category: ["module"] },
  { kind: "family", field: "tag", aliases: ["driver_id_dallas_tag", "dallas_tag"], category: ["module", "ptt"] },
  { kind: "direct", field: "gps", aliases: ["sky_gps", "external_gps"], category: ["module"] },
  { kind: "family", field: "fuel_probe", aliases: ["fuel_probe_single_tank", "fuel_probe_dual_tank", "fuel_probe", "single_tank", "dual_tank"], category: ["module"] },
  { kind: "direct", field: "tpiece", aliases: ["fuel_t_connector", "t_connector"], category: ["module"] },
  { kind: "direct", field: "_7m_harness_for_probe", aliases: ["7m_fuel_harness", "7m_harness"], category: ["module"] },
  { kind: "direct", field: "_3m_extension_cable", aliases: ["3m_fuel_harness", "3m_harness", "extension_cable_3m", "4_pin_cable_3m"], category: ["module", "camera_equipment", "dvr_camera"] },
  { kind: "direct", field: "_1m_extension_cable", aliases: ["1m_fuel_harness", "probe_harness"], category: ["module"] },
  { kind: "direct", field: "industrial_panic", aliases: ["industrial"], category: ["input"] },
  { kind: "direct", field: "flat_panic", aliases: ["panic_flush"], category: ["input"] },
  { kind: "direct", field: "buzzer", aliases: ["buzzer_24v_95db_30_x_16mm_pnl_mnt_wth_wires", "buzzer"], category: ["module"] },
  { kind: "direct", field: "pfk_main_unit", aliases: ["video_main_unit"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "family", field: "pfk_dome", aliases: ["infrared_camera", "non_ir_camera"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "pfk_road_facing", aliases: ["outside_ir_camera"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "pfk_5m", aliases: ["extension_cable_5m"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "pfk_10m", aliases: ["extension_cable_10m"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "pfk_15m", aliases: ["extension_cable_15m"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "breathaloc", aliases: ["breathalok", "breathaloc"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "mic", aliases: ["mic_and_speaker"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "speaker", aliases: ["mic_and_speaker", "mtx_speaker", "speaker"], type: ["pfk_camera", "mtx_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "_4ch_mdvr", aliases: ["4_channel_dvr", "4_channel_dvr_compact", "mdvr_mini_4ch_non_ai"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "_5ch_mdvr", aliases: ["mdvr_mini_5ch_ai"], category: ["camera_equipment"] },
  { kind: "direct", field: "_8ch_mdvr", aliases: ["8_channel_dvr"], category: ["dvr_camera"] },
  { kind: "direct", field: "vw502_dual_lens_camera", aliases: ["dual_lense_and_camera", "road_facing_and_in_cab_camera"], category: ["dvr_camera"] },
  { kind: "direct", field: "vw303_driver_facing_camera", aliases: ["driver_facing_camera_only"], category: ["dvr_camera"] },
  { kind: "direct", field: "vw502f_road_facing_camera", aliases: ["road_facing_camera_only"], category: ["dvr_camera"] },
  { kind: "family", field: "vw400_dome", aliases: ["outside_ir_cameras", "rear_view_ahd_camera", "rear_view_ipc_camera", "ip_camera_round", "outside_side_view_camera", "outside_side_view_cam", "ip_camera"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "_5m_cable_for_camera_4pin", aliases: ["4_pin_cable_5m", "5_meter_cable", "mtx_cable_5m"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "_10m_cable_for_camera_4pin", aliases: ["4_pin_cable_10m", "10_meter_extension_cable", "mtx_cable_10m", "mtx_10m_6_pin_cable"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "_5m_cable_6pin", aliases: ["5m_ip_camera_cable_6_pins", "mtx_5m_ipc_6_pin", "5m_ip_camera_cable_6_pin"], category: ["camera_equipment"] },
  { kind: "direct", field: "sd_card_1tb", aliases: ["1tb_hd_memory_card", "sd_card_1tb"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "sd_card_2tb", aliases: ["2tb_hd_memory_card", "sd_card_2tb"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "sd_card_256gb", aliases: ["2_5_sd_256gb", "2_5_tf_256gb", "sd_card_256gb"], category: ["dvr_camera", "dashcam", "camera_equipment"] },
  { kind: "direct", field: "sd_card_480gb", aliases: ["2_5_ssd_480gb", "sd_card_480gb"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "sd_card_512gb", aliases: ["sd_card_512gb", "mtx_sd_card_sd_card_512gb", "mtx_tf_card"], category: ["camera_equipment"] },
  { kind: "direct", field: "adas_02_road_facing", aliases: ["road_facing_adas_camera", "road_facing_adas_cam", "pdc_camera"], category: ["camera_equipment", "dashcam"] },
  { kind: "direct", field: "dms01_driver_facing", aliases: ["driver_facing_camera_no_ai", "driver_facing_a_pillar", "dashcam_cab_facing"], category: ["camera_equipment", "dashcam"] },
  { kind: "direct", field: "a2_dash_cam", aliases: ["dashcam_forward_facing"], category: ["dashcam"] },
  { kind: "direct", field: "mtx_mc202x", aliases: ["mtx_mtx_mc202x", "mtx_mc202x"], type: ["mtx_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "main_fm_harness", aliases: ["starlink_spare_harness"], category: ["module"] },
  { kind: "direct", field: "corpconnect_sim_no", aliases: ["sim_card_camera_corpconnect"], category: ["sim"] },
  { kind: "direct", field: "corpconnect_data_no", aliases: ["m2m_data_card"], category: ["sim"] },
  { kind: "direct", field: "sim_card_number", aliases: ["vodacom_sim_card", "5g_corp_sim_card", "sim_card"], category: ["sim"] },
  { kind: "direct", field: "roaming", aliases: ["roaming", "cross_border_tracking"], category: ["services"] },
  { kind: "direct", field: "controlroom", aliases: ["control_room_elite", "control_room_superior"], category: ["services"] },
  { kind: "direct", field: "after_hours", aliases: ["after_hours_maintenance"], category: ["services"] },
  { kind: "direct", field: "consultancy", aliases: ["management_and_consultant"], category: ["services"] },
  { kind: "direct", field: "maintenance", aliases: ["service", "maintenance_module"], category: ["services"] },
  { kind: "direct", field: "software", aliases: ["routing", "routing_opsi"], category: ["services"] },
];

export function resolveVehicleProductMapping(item: ProductLike): VehicleProductMapping | null {
  const product = normalizeVehicleProductText(item?.product ?? item?.name);
  const description = normalizeVehicleProductText(item?.description);
  const code = normalizeVehicleProductText(item?.code ?? item?.item_code);
  const type = normalizeVehicleProductText(item?.type);
  const category = normalizeVehicleProductText(item?.category);
  const combined = [product, description, code].filter(Boolean).join("_");
  const searchTerms = [product, description, code, combined].filter(Boolean);

  for (const rule of PRODUCT_MAPPING_RULES) {
    const typeMatches = !rule.type?.length || asArray(rule.type).includes(type);
    const categoryMatches =
      !rule.category?.length || asArray(rule.category).includes(category);
    if (!typeMatches || !categoryMatches) continue;

    if (
      rule.aliases.some((alias) => {
        const normalizedAlias = normalizeVehicleProductText(alias);
        return searchTerms.some(
          (term) => term === normalizedAlias || term.includes(normalizedAlias),
        );
      })
    ) {
      return { kind: rule.kind, field: rule.field };
    }
  }

  return null;
}
