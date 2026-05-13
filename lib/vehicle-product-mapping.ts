export type VehicleMappingKind = "direct" | "grouped" | "family";

export type VehicleProductMapping = {
  kind: VehicleMappingKind;
  field: string;
};

type ProductMappingRule = VehicleProductMapping & {
  aliases: string[];
  ids?: string[];
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
  {
    kind: "grouped",
    field: "skylink_pro",
    aliases: [
      "skylink_pro",
      "skylink_pro_2g_3g_4g",
      "starlink_pro",
      "p03starlink3g",
      "skylink_obd",
      "skylink_obd_plugin",
      "p08obdsafety",
      "skylink_motorbike",
      "p08scooter",
      "skylite",
    ],
    ids: [
      "233a6aba-e005-4253-b05a-f9d0fe798a14",
      "8a11682e-5958-4b9b-aed5-5aa49ff2e0e4",
      "deccb2a4-5406-4151-8bb9-fff13f97b7c4",
      "20c5c564-bf65-4377-be3c-8b5c1be165df",
      "bf6c8700-fe52-4947-8db9-2c3d21ebc5b4",
    ],
    type: ["fms"],
    category: ["fms"],
  },
  {
    kind: "grouped",
    field: "sky_on_batt_ign_unit",
    aliases: [
      "starlink_onbatt",
      "onbatt",
      "on_batt",
      "sky_on_batt",
      "sky_on_batt_ign",
      "p03onbatignaumicrosim",
    ],
    ids: ["cc28faee-e0ba-48eb-911c-e7087276d554"],
    type: ["fms"],
    category: ["fms"],
  },
  { kind: "grouped", field: "skylink_trailer_unit", aliases: ["skylink_asset_trailer", "skylink_asset", "trailer_unit", "ituran_starlink_4g_au"], ids: ["d52e3106-3f3d-4762-8dfa-9da37e87478d"], type: ["fms"], category: ["fms"] },
  { kind: "grouped", field: "sky_scout_12v", aliases: ["skylink_scout_12v", "scout_12v"], ids: ["ef165063-5640-4279-8054-a7754f8782a5"], type: ["fms"], category: ["fms"] },
  { kind: "grouped", field: "sky_scout_24v", aliases: ["skylink_scout_24v", "scout_24v"], ids: ["4419ad01-0866-47d9-9363-337fc32bc693"], type: ["fms"], category: ["fms"] },
  { kind: "direct", field: "skyspy", aliases: ["skyspy"], type: ["fms"], category: ["fms", "services"] },
  { kind: "family", field: "beame", aliases: ["beame_backup_unit", "beame_beacon", "wireless_recovery_unit", "wireless_recovery_unit_only", "backup_unit", "beacon", "beame"], ids: ["24cd3dfe-9e9a-4837-a136-b325feb401f5"], category: ["backup"] },
  { kind: "direct", field: "sky_safety", aliases: ["sky_safety"], category: ["module"] },
  { kind: "direct", field: "sky_ican", aliases: ["sky_can", "canbus_integration"], ids: ["c1180e2f-171a-4a4b-9855-4749a3465070"], category: ["module"] },
  { kind: "direct", field: "keypad", aliases: ["driver_id_keypad", "keypad_driver_id"], ids: ["0c94ec0e-5165-4d15-9aeb-eaa5c3f6a7df"], category: ["module"] },
  { kind: "family", field: "tag", aliases: ["driver_id_dallas_tag", "dallas_tag", "fm_blue_driver_tag", "440ft0073"], ids: ["5de91661-874c-4efd-998a-d7bd2967f061", "f2ed713a-78a0-431b-a400-d44367902825"], category: ["module", "ptt", "mix"] },
  { kind: "direct", field: "gps", aliases: ["sky_gps", "external_gps", "fm_gps_antenna", "fm_glonass_gps_ant", "440ft0694", "440ft0694_1"], category: ["module", "mix"] },
  { kind: "family", field: "fuel_probe", aliases: ["fuel_probe_single_tank", "fuel_probe_dual_tank", "fuel_probe", "single_tank", "dual_tank"], ids: ["aa0988dc-6462-4767-a6ce-a9e2ef053206", "044258a0-58dd-4a9d-b9a1-06ec3cac4303"], category: ["module"] },
  { kind: "direct", field: "tpiece", aliases: ["fuel_t_connector", "t_connector"], category: ["module"] },
  { kind: "direct", field: "_7m_harness_for_probe", aliases: ["7m_fuel_harness", "7m_harness"], category: ["module"] },
  { kind: "direct", field: "_3m_extension_cable", aliases: ["3m_fuel_harness", "3m_harness", "extension_cable_3m", "4_pin_cable_3m"], ids: ["c2d0176c-5223-4dcb-888d-7fb500dcb415"], category: ["module", "camera_equipment", "dvr_camera"] },
  { kind: "direct", field: "_1m_extension_cable", aliases: ["1m_fuel_harness", "probe_harness"], ids: ["eb74fd62-1046-4215-9592-f738c8e947e2"], category: ["module"] },
  { kind: "direct", field: "industrial_panic", aliases: ["industrial"], ids: ["2c6f7f90-02c9-42bf-bda9-260821deeef8", "a34af4fc-7bfe-4a3d-add2-d00847c992e2"], category: ["input"] },
  { kind: "direct", field: "flat_panic", aliases: ["panic_flush", "sky_panic", "panic_button"], ids: ["f3741375-e24e-41c1-ba59-cc40aab5045a", "f83f7a8b-fb86-4f19-84b5-fe6255ce53c3"], category: ["input", "module"] },
  { kind: "direct", field: "cia", aliases: ["starter_cut_relay", "starter_cut", "interlock_system", "720081_02"], ids: ["ea6a7577-6421-4946-bab0-5a170bb52d7e", "92d2edfa-31f8-4a74-b167-9b430185fcbe"], category: ["input", "module"] },
  { kind: "direct", field: "fm_unit", aliases: ["fm3316", "fm_3316_communicator", "mix_4000", "fm_main_harness_mp5"], ids: ["adbb82d5-17de-427d-b84c-50c267f42d5d", "e8a9aac7-98fd-4a9f-b01e-d5a3670df4b3", "73c4e3d3-4d99-425b-9ccd-26913e7164d1"], category: ["mix", "module", "fms"] },
  { kind: "direct", field: "gsm", aliases: ["440ft0599", "fm_gsm_antenna", "penta_band_gsm_ant"], category: ["mix", "module"] },
  { kind: "direct", field: "buzzer", aliases: ["buzzer_24v_95db_30_x_16mm_pnl_mnt_wth_wires", "buzzer"], category: ["module"] },
  { kind: "direct", field: "pfk_main_unit", aliases: ["video_main_unit"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "family", field: "pfk_dome", aliases: ["infrared_camera", "non_ir_camera"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "pfk_road_facing", aliases: ["outside_ir_camera"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "pfk_5m", aliases: ["extension_cable_5m"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "pfk_10m", aliases: ["extension_cable_10m"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "pfk_15m", aliases: ["extension_cable_15m"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "breathaloc", aliases: ["breathalok", "breathaloc"], ids: ["42b87e7b-027f-4350-bce4-edacb21e671b"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "mic", aliases: ["mic_and_speaker"], type: ["pfk_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "speaker", aliases: ["mic_and_speaker", "mtx_speaker", "speaker"], type: ["pfk_camera", "mtx_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "_4ch_mdvr", aliases: ["4_channel_dvr", "4_channel_dvr_compact", "mdvr_mini_4ch_non_ai"], ids: ["1780a1d4-b489-4258-a199-b6668b24cd0e", "96e241aa-f62c-4e6a-bd6b-2713b4d8074f"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "_5ch_mdvr", aliases: ["mdvr_mini_5ch_ai"], ids: ["ad8db000-a62a-4c27-932b-c1d32c4b70af"], category: ["camera_equipment"] },
  { kind: "direct", field: "_8ch_mdvr", aliases: ["8_channel_dvr"], category: ["dvr_camera"] },
  { kind: "direct", field: "vw502_dual_lens_camera", aliases: ["dual_lense_and_camera", "road_facing_and_in_cab_camera"], ids: ["f258789b-6a34-4365-b53a-34914efec19f"], category: ["dvr_camera"] },
  { kind: "direct", field: "vw303_driver_facing_camera", aliases: ["driver_facing_camera_only"], category: ["dvr_camera"] },
  { kind: "direct", field: "vw502f_road_facing_camera", aliases: ["road_facing_camera_only"], category: ["dvr_camera"] },
  { kind: "family", field: "vw400_dome", aliases: ["outside_ir_cameras", "rear_view_ahd_camera", "rear_view_ipc_camera", "ip_camera_round", "outside_side_view_camera", "outside_side_view_cam", "ip_camera"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "_5m_cable_for_camera_4pin", aliases: ["4_pin_cable_5m", "5_meter_cable", "mtx_cable_5m"], ids: ["64fbb046-716c-4616-bebf-883d00c84559"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "_10m_cable_for_camera_4pin", aliases: ["4_pin_cable_10m", "10_meter_extension_cable", "mtx_cable_10m", "mtx_10m_6_pin_cable"], ids: ["49d824e6-b45e-4f76-97ca-8cad8e247042"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "_5m_cable_6pin", aliases: ["5m_ip_camera_cable_6_pins", "mtx_5m_ipc_6_pin", "5m_ip_camera_cable_6_pin"], category: ["camera_equipment"] },
  { kind: "direct", field: "sd_card_1tb", aliases: ["1tb_hd_memory_card", "sd_card_1tb"], ids: ["4d5a3f9e-10c3-416c-bff8-369d7bc6f51c"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "sd_card_2tb", aliases: ["2tb_hd_memory_card", "sd_card_2tb"], ids: ["f18fae87-37dd-4e43-9705-f8661194c752"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "sd_card_256gb", aliases: ["2_5_sd_256gb", "2_5_tf_256gb", "sd_card_256gb"], ids: ["e36f18b2-c8d9-4323-9adc-41bfdf0039d9", "2689e3fb-d591-40d6-84f5-e9ba17825ebf"], category: ["dvr_camera", "dashcam", "camera_equipment"] },
  { kind: "direct", field: "sd_card_480gb", aliases: ["2_5_ssd_480gb", "sd_card_480gb"], ids: ["3b1ef2c1-f1ec-4e00-ace6-97ff02295262"], category: ["dvr_camera", "camera_equipment"] },
  { kind: "direct", field: "sd_card_512gb", aliases: ["sd_card_512gb", "mtx_sd_card_sd_card_512gb", "mtx_tf_card"], category: ["camera_equipment"] },
  { kind: "direct", field: "adas_02_road_facing", aliases: ["road_facing_adas_camera", "road_facing_adas_cam", "pdc_camera"], ids: ["701686b7-e764-48e8-a7e7-dfc4f3e9d3c7"], category: ["camera_equipment", "dashcam"] },
  { kind: "direct", field: "dms01_driver_facing", aliases: ["driver_facing_camera_no_ai", "driver_facing_a_pillar", "dashcam_cab_facing"], category: ["camera_equipment", "dashcam"] },
  { kind: "direct", field: "a2_dash_cam", aliases: ["dashcam_forward_facing"], category: ["dashcam"] },
  { kind: "direct", field: "mtx_mc202x", aliases: ["mtx_mtx_mc202x", "mtx_mc202x", "mtx_mc202_eu", "4g_dashcam_mc202", "mtx_mc401", "4g_dashcam_4ch"], ids: ["b5bdde21-b25b-4433-852b-dfcb36b2a1cb", "3017be68-7cde-49a2-a54b-a9967b530e47", "9d89891d-9075-4417-916a-7b55c1c425fb"], type: ["mtx_camera"], category: ["camera_equipment"] },
  { kind: "direct", field: "main_fm_harness", aliases: ["starlink_spare_harness"], category: ["module"] },
  { kind: "direct", field: "corpconnect_sim_no", aliases: ["sim_card_camera_corpconnect"], category: ["sim"] },
  { kind: "direct", field: "corpconnect_data_no", aliases: ["m2m_data_card"], category: ["sim"] },
  { kind: "direct", field: "sim_card_number", aliases: ["vodacom_sim_card", "5g_corp_sim_card", "sim_card"], category: ["sim"] },
  { kind: "direct", field: "additional_data", aliases: ["additional_data", "sms"], ids: ["e0ced9ec-c73c-42dc-b290-573522b42436", "85229bd4-0b57-404a-8601-62e995567f3c"], category: ["services", "sms", "data"] },
  { kind: "direct", field: "roaming", aliases: ["roaming", "cross_border_tracking"], ids: ["dde96477-cf45-4dac-abc5-2b635b542fc1"], category: ["services"] },
  { kind: "direct", field: "controlroom", aliases: ["control_room_elite", "control_room_superior"], ids: ["52db6bd1-4512-480e-92fb-46945a4b06c9", "b3a79281-bc19-42ca-b5ff-1ba63b348255"], category: ["services"] },
  { kind: "direct", field: "after_hours", aliases: ["after_hours_maintenance"], ids: ["be2c3aaa-76be-48ff-a001-bc77c1bf312c"], category: ["services"] },
  { kind: "direct", field: "consultancy", aliases: ["management_and_consultant"], ids: ["6e6a2bf1-8197-4da0-af49-2a6f6cceff3e"], category: ["services"] },
  { kind: "direct", field: "maintenance", aliases: ["service", "maintenance_module"], category: ["services"] },
  { kind: "direct", field: "software", aliases: ["software", "routing", "routing_opsi", "sky_talk_portable_with_keypad", "sky_talk_portable_with_nfc", "sky_talk_mobile", "sky_talk_portable", "set_up_and_training"], ids: ["06ae912e-6545-4155-bccc-93940ded9eda", "5c525deb-7c2f-4f06-a0fa-23902b07995a", "45b3f8f7-e24c-4e83-bdc9-d5bebe67ecec", "dc331b5e-2acc-41b1-97b7-13f1e448a4be", "ad17a2c4-ca59-4208-8185-ffa3a4169eba"], category: ["services", "ptt"] },
  { kind: "direct", field: "tt_linehaul_software_development", aliases: ["tt_linehaul_software_development", "tt_linehaul"], category: ["services"] },
  { kind: "direct", field: "tt_express_software_development", aliases: ["tt_express_software_development", "tt_express"], category: ["services"] },
  { kind: "direct", field: "tt_fmcg_software_development", aliases: ["tt_fmcg_software_development", "tt_fmcg"], category: ["services"] },
  { kind: "direct", field: "rapid_freight_software_development", aliases: ["rapid_freight_software_development", "rapid_freight"], category: ["services"] },
  { kind: "direct", field: "remco_freight_software_development", aliases: ["remco_freight_software_development", "remco_freight"], category: ["services"] },
  { kind: "direct", field: "vt_logistics_software_development", aliases: ["vt_logistics_software_development", "vt_logistics"], category: ["services"] },
  { kind: "direct", field: "epilite_software_development", aliases: ["epilite_software_development", "epilite"], category: ["services"] },
];

export function resolveVehicleProductMapping(item: ProductLike): VehicleProductMapping | null {
  const itemId = normalizeVehicleProductText(
    item?.id ?? item?.item_id ?? item?.product_item_id ?? item?.productId,
  );
  const product = normalizeVehicleProductText(item?.product ?? item?.name);
  const description = normalizeVehicleProductText(item?.description);
  const code = normalizeVehicleProductText(item?.code ?? item?.item_code);
  const type = normalizeVehicleProductText(item?.type);
  const category = normalizeVehicleProductText(item?.category);
  const combined = [product, description, code].filter(Boolean).join("_");
  const searchTerms = [product, description, code, combined].filter(Boolean);

  for (const rule of PRODUCT_MAPPING_RULES) {
    if (itemId && rule.ids?.length) {
      const normalizedIds = asArray(rule.ids);
      if (normalizedIds.includes(itemId)) {
        return { kind: rule.kind, field: rule.field };
      }
    }

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
