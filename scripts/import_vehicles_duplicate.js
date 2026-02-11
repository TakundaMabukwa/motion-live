const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const columnMapping = {
  'Company Name: ': 'company',
  'Fleet number: ': 'fleet_number',
  'Reg: ': 'reg',
  'Make: ': 'make',
  'Model:': 'model',
  'Vin:': 'vin',
  'Engine: ': 'engine',
  'Year:': 'year',
  'Colour: ': 'colour',
  'Skylink - Trailer Unit Serial number:': 'skylink_trailer_unit_serial_number',
  'Skylink - Trailer Unit IP:': 'skylink_trailer_unit_ip',
  'Sky on batt - Ign unit Serial number:': 'sky_on_batt_ign_unit_serial_number',
  'Sky on batt - Ign unit IP:': 'sky_on_batt_ign_unit_ip',
  'Skylink - Voice kit - Serial number: ': 'skylink_voice_kit_serial_number',
  'Skylink - Voice kit - IP: ': 'skylink_voice_kit_ip',
  'Sky Scout - 12v - Serial number: ': 'sky_scout_12v_serial_number',
  'Sky Scout - 12v - IP: ': 'sky_scout_12v_ip',
  'Sky Scout - 24v - Serial number: ': 'sky_scout_24v_serial_number',
  'Sky Scout - 24v - IP: ': 'sky_scout_24v_ip',
  'Skylink Pro - Serial number:': 'skylink_pro_serial_number',
  'Skylink Pro - IP: ': 'skylink_pro_ip',
  'Skylink sim card no: ': 'skylink_sim_card_no',
  'Skylink data number: ': 'skylink_data_number',
  'Sky Safety: ': 'sky_safety',
  'Sky Idata:': 'sky_idata',
  'Sky ICAN:': 'sky_ican',
  'Industrial Panic: ': 'industrial_panic',
  'Flat Panic:': 'flat_panic',
  'Buzzer:': 'buzzer',
  'Tag ': 'tag',
  'Tag Reader: ': 'tag_reader',
  'Keypad: ': 'keypad',
  'Keypad (Waterproof) ': 'keypad_waterproof',
  'Early Warning:': 'early_warning',
  'CIA:': 'cia',
  'FM Unit ': 'fm_unit',
  'Sim card number: ': 'sim_card_number',
  'Data number: ': 'data_number',
  'GPS:': 'gps',
  'GSM:': 'gsm',
  'Tag: ': 'tag_',
  'Tag reader: ': 'tag_reader_',
  'Main Fm Harness: ': 'main_fm_harness',
  'Beame 1: ': 'beame_1',
  'Beame 2: ': 'beame_2',
  'Beame 3: ': 'beame_3',
  'Beame 4: ': 'beame_4',
  'Beame 5: ': 'beame_5',
  'Fuel probe 1: ': 'fuel_probe_1',
  'Fuel probe 2:': 'fuel_probe_2',
  '7m harness for probe: ': '_7m_harness_for_probe',
  'T-Piece ': 'tpiece',
  'Idata: ': 'idata',
  '1m extension cable: ': '_1m_extension_cable',
  '3m extension cable:': '_3m_extension_cable',
  '4CH MDVR:': '_4ch_mdvr',
  '5CH MDVR:': '_5ch_mdvr',
  '8CH MDVR:': '_8ch_mdvr',
  'A2 Dash cam:': 'a2_dash_cam',
  'A3 Dash cam AI: ': 'a3_dash_cam_ai',
  'Corpconnect sim no: ': 'corpconnect_sim_no',
  'Corpconnect data no: ': 'corpconnect_data_no',
  'SIM ID: ': 'sim_id',
  '5m cable for camera 4pin:': '_5m_cable_for_camera_4pin',
  '5m cable 6pin: ': '_5m_cable_6pin',
  '10m cable for camera 4pin:': '_10m_cable_for_camera_4pin',
  'A2 MEC 5: ': 'a2_mec_5',
  'VW400 Dome 1:': 'vw400_dome_1',
  'VW400 Dome 2:': 'vw400_dome_2',
  'VW300 Dakkie Dome 1:': 'vw300_dakkie_dome_1',
  'VW300 Dakkie Dome 2:': 'vw300_dakkie_dome_2',
  'VW502 - Dual Lens Camera:': 'vw502_dual_lens_camera',
  'VW303 - Driver Facing Camera: ': 'vw303_driver_facing_camera',
  'VW502F - Road Facing Camera: ': 'vw502f_road_facing_camera',
  'VW306 - DVR - Road Facing for 4ch & 8ch: ': 'vw306_dvr_road_facing_for_4ch_8ch',
  'VW306M - A2 Dash Cam:': 'vw306m_a2_dash_cam',
  'DMS01 - Driver Facing: ': 'dms01_driver_facing',
  'ADAS 02 - Road Facing ': 'adas_02_road_facing',
  'VW-100IP - Driver Facing IP: ': 'vw100ip_driver_facing_ip',
  'SD Card 1TB:': 'sd_card_1tb',
  'SD Card 2TB:': 'sd_card_2tb',
  'SD Card 480GB:': 'sd_card_480gb',
  'SD Card 256GB:': 'sd_card_256gb',
  'SD Card 512GB:': 'sd_card_512gb',
  'SD Card 250GB:': 'sd_card_250gb',
  'Mic:': 'mic',
  'Speaker:': 'speaker',
  'PFK Main Unit:': 'pfk_main_unit',
  'PFK Corpconnect sim number: ': 'pfk_corpconnect_sim_number',
  'PFK Corpconnect data number: ': 'pfk_corpconnect_data_number',
  'Breathaloc:': 'breathaloc',
  'PFK Road Facing:': 'pfk_road_facing',
  'PFK Driver Facing: ': 'pfk_driver_facing',
  'PFK Dome 1: ': 'pfk_dome_1',
  'PFK Dome 2:': 'pfk_dome_2',
  'PFK 5m:': 'pfk_5m',
  'PFK 10m: ': 'pfk_10m',
  'PFK 15m: ': 'pfk_15m',
  'PFK 20m:': 'pfk_20m',
  'Roller door switches:': 'roller_door_switches',
  'Account number: ': 'account_number',
  'Skylink - Trailer Unit Rental:': 'skylink_trailer_unit_rental',
  'Skylink - Trailer Sub:': 'skylink_trailer_sub',
  'Sky on batt - Ign Rental:': 'sky_on_batt_ign_rental',
  'Sky on batt - Sub:': 'sky_on_batt_sub',
  'Skylink - Voice kit - Rental: ': 'skylink_voice_kit_rental',
  'Skylink - Voice kit - Sub: ': 'skylink_voice_kit_sub',
  'Sky Scout - 12v - Rental: ': 'sky_scout_12v_rental',
  'Sky Scout - 12v - Sub: ': 'sky_scout_12v_sub',
  'Sky Scout - 24v - Rental: ': 'sky_scout_24v_rental',
  'Sky Scout - 24v - Sub: ': 'sky_scout_24v_sub',
  'Skylink Pro - Rental:': 'skylink_pro_rental',
  'Skylink Pro - Sub: ': 'skylink_pro_sub',
  'Sky Idata Rental:': 'sky_idata_rental',
  'Sky ICAN Rental:': 'sky_ican_rental',
  'Industrial Panic Rental: ': 'industrial_panic_rental',
  'Flat Panic Rental:': 'flat_panic_rental',
  'Buzzer Rental:': 'buzzer_rental',
  'Tag Rental: ': 'tag_rental',
  'Tag Reader Rental: ': 'tag_reader_rental',
  'Keypad Rental: ': 'keypad_rental',
  'Early Warning Rental:': 'early_warning_rental',
  'CIA Rental:': 'cia_rental',
  'FM Unit Rental:  ': 'fm_unit_rental',
  'FM Unit Sub: ': 'fm_unit_sub',
  'GPS Rental:': 'gps_rental',
  'GSM Rental: :': 'gsm_rental',
  'Tag Rental: _1': 'tag_rental_',
  'Tag reader Rental: ': 'tag_reader_rental_',
  'Main Fm Harness Rental: ': 'main_fm_harness_rental',
  'Beame 1 Rental: ': 'beame_1_rental',
  'Beame 1 Sub: ': 'beame_1_sub',
  'Beame 2 Rental: ': 'beame_2_rental',
  'Beame 2 Sub: ': 'beame_2_sub',
  'Beame 3 Rental: ': 'beame_3_rental',
  'Beame 3 Sub: ': 'beame_3_sub',
  'Beame 4 Rental: ': 'beame_4_rental',
  'Beame 4 Sub: ': 'beame_4_sub',
  'Beame 5 Rental: ': 'beame_5_rental',
  'Beame 5 Sub: ': 'beame_5_sub',
  'Single Probe Rental: ': 'single_probe_rental',
  'Single Probe Sub: ': 'single_probe_sub',
  'Dual Probe Rental: ': 'dual_probe_rental',
  'Dual Probe Sub: ': 'dual_probe_sub',
  '7m harness for probe Rental: ': '_7m_harness_for_probe_rental',
  'T-Piece Rental: ': 'tpiece_rental',
  'Idata Rental: ': 'idata_rental',
  '1m extension cable Rental: ': '_1m_extension_cable_rental',
  '3m extension cable Rental:': '_3m_extension_cable_rental',
  '4CH MDVR Rental:': '_4ch_mdvr_rental',
  '4CH MDVR Sub:': '_4ch_mdvr_sub',
  '5CH MDVR Rental:': '_5ch_mdvr_rental',
  '5CH MDVR Sub:': '_5ch_mdvr_sub',
  '8CH MDVR Rental:': '_8ch_mdvr_rental',
  '8CH MDVR Sub:': '_8ch_mdvr_sub',
  'A2 Dash cam Rental:': 'a2_dash_cam_rental',
  'A2 Dash cam Sub:': 'a2_dash_cam_sub',
  'A3 Dash cam AI Rental: ': 'a3_dash_cam_ai_rental',
  '5m cable for camera 4pin Rental:': '_5m_cable_for_camera_4pin_rental',
  '5m cable 6pin Rental: ': '_5m_cable_6pin_rental',
  '10m cable for camera 4pin Rental:': '_10m_cable_for_camera_4pin_rental',
  'A2 MEC 5 Rental: ': 'a2_mec_5_rental',
  'VW400 Dome 1 Rental:': 'vw400_dome_1_rental',
  'VW400 Dome 2 Rental:': 'vw400_dome_2_rental',
  'VW300 Dakkie Dome 1 Rental:': 'vw300_dakkie_dome_1_rental',
  'VW300 Dakkie Dome 2 Rental:': 'vw300_dakkie_dome_2_rental',
  'VW502 - Dual Lens Camera Rental:': 'vw502_dual_lens_camera_rental',
  'VW303 - Driver Facing Camera Rental: ': 'vw303_driver_facing_camera_rental',
  'VW502F - Road Facing Camera Rental: ': 'vw502f_road_facing_camera_rental',
  'VW306 - DVR - Road Facing for 4ch & 8ch Rental: ': 'vw306_dvr_road_facing_for_4ch_8ch_rental',
  'VW306M - A2 Dash Cam Rental:': 'vw306m_a2_dash_cam_rental',
  'DMS01 - Driver Facing Rental: ': 'dms01_driver_facing_rental',
  'ADAS 02 - Road Facing Rental:  ': 'adas_02_road_facing_rental',
  'VW-100IP - Driver Facing Rental: ': 'vw100ip_driver_facing_rental',
  'SD Card 1TB Rental:': 'sd_card_1tb_rental',
  'SD Card 2TB Rental:': 'sd_card_2tb_rental',
  'SD Card 480GB Rental:': 'sd_card_480gb_rental',
  'SD Card 256GB Rental:': 'sd_card_256gb_rental',
  'SD Card 512GB Rental:': 'sd_card_512gb_rental',
  'SD Card 250GB Rental:': 'sd_card_250gb_rental',
  'Mic Rental:': 'mic_rental',
  'Speaker Rental:': 'speaker_rental',
  'PFK Main Unit Rental:': 'pfk_main_unit_rental',
  'PFK Main Unit Sub:': 'pfk_main_unit_sub',
  'Breathaloc Rental:': 'breathaloc_rental',
  'PFK Road Facing Rental:': 'pfk_road_facing_rental',
  'PFK Driver Facing Rental: ': 'pfk_driver_facing_rental',
  'PFK Dome 1 Rental: ': 'pfk_dome_1_rental',
  'PFK Dome 2 Rental:': 'pfk_dome_2_rental',
  'PFK 5m Rental:': 'pfk_5m_rental',
  'PFK 10m Rental: ': 'pfk_10m_rental',
  'PFK 15m Rental: ': 'pfk_15m_rental',
  'PFK 20m Rental:': 'pfk_20m_rental',
  'Roller door switches Rental:': 'roller_door_switches_rental',
  'Consultancy: ': 'consultancy',
  'Roaming:': 'roaming',
  'Maintenance:': 'maintenance',
  'After hours: ': 'after_hours',
  'Controlroom:': 'controlroom',
  'Total Rental: ': 'total_rental',
  'Total Sub: ': 'total_sub',
  'Total Rental & Sub:': 'total_rental_sub'
};

const numericFields = ['total_rental', 'total_sub', 'total_rental_sub'];

function mapRow(excelRow) {
  const dbRow = {};
  for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
    const value = excelRow[excelCol];
    
    if (numericFields.includes(dbCol)) {
      if (value === '' || value === null || value === undefined) {
        dbRow[dbCol] = null;
      } else {
        const strValue = String(value).replace(/[R,\s]/g, '').trim();
        dbRow[dbCol] = strValue && !isNaN(strValue) ? parseFloat(strValue) : null;
      }
    } else {
      if (value === '' || value === null || value === undefined) {
        dbRow[dbCol] = '';
      } else {
        dbRow[dbCol] = String(value).trim();
      }
    }
  }
  return dbRow;
}

async function importData() {
  try {
    const excelPath = path.join(__dirname, 'vehicles_with_cost_codes.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`Total rows to import: ${data.length}`);

    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const mappedBatch = batch.map(mapRow);

      const { data: result, error } = await supabase
        .from('vehicles_duplicate')
        .insert(mappedBatch);

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`Inserted batch ${i / batchSize + 1}: ${successCount} rows completed`);
        mappedBatch.slice(0, 3).forEach(row => {
          console.log(`  - ${row.company} | ${row.fleet_number} | ${row.reg} | Cost Code: ${row.new_account_number}`);
        });
      }
    }

    console.log(`\nImport completed!`);
    console.log(`Success: ${successCount} rows`);
    console.log(`Errors: ${errorCount} rows`);
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

importData();
