require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const columnMap = {
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
  'Roller door switches:': 'roller_door_switches'
};

let kargoCounter = 0;

function getAccountNumber(sheetName) {
  const lower = sheetName.toLowerCase();
  if (lower.includes('kargo')) {
    kargoCounter++;
    return `KARG-${String(kargoCounter).padStart(4, '0')}`;
  }
  if (lower.includes('auma')) return 'AUMA-0001';
  if (lower.includes('interspares')) return 'INTE-0001';
  if (lower.includes('airgas')) return 'AIRG-0001';
  if (lower.includes('steelgrain')) return 'STEE-0001';
  if (lower.includes('danquah')) return 'DANQ-0001';
  if (lower.includes('barline')) return 'BARL-0001';
  if (lower.includes('dynamic')) return 'DYNA-0001';
  if (lower.includes('fuel spec')) return 'FUEL-0001';
  return null;
}

async function insertVehicles() {
  console.log('🚗 INSERTING VEHICLES\n');
  
  const workbook = XLSX.readFile('SkyFlo Updated list.xlsx');
  let totalInserted = 0;
  let totalSkipped = 0;
  
  for (const sheetName of workbook.SheetNames) {
    const accountNumber = getAccountNumber(sheetName);
    if (!accountNumber) {
      console.log(`⏭️  Skipping sheet: ${sheetName} (no account mapping)`);
      continue;
    }
    
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    const headers = data[0];
    const rows = data.slice(1).filter(row => row && row.length > 0);
    
    console.log(`\n📄 Processing: ${sheetName} (${accountNumber})`);
    console.log(`   Rows: ${rows.length}`);
    
    for (const row of rows) {
      const vehicle = { new_account_number: accountNumber };
      
      headers.forEach((header, i) => {
        const dbColumn = columnMap[header];
        if (dbColumn && row[i]) {
          vehicle[dbColumn] = row[i].toString().trim();
        }
      });
      
      // Skip if no reg
      if (!vehicle.reg) {
        totalSkipped++;
        continue;
      }
      
      // Check if reg exists
      const { data: existing } = await supabase
        .from('vehicles')
        .select('id')
        .eq('reg', vehicle.reg)
        .single();
      
      if (existing) {
        console.log(`   ⏭️  Skipping ${vehicle.reg} (already exists)`);
        totalSkipped++;
        continue;
      }
      
      const { error } = await supabase.from('vehicles').insert(vehicle);
      
      if (error) {
        console.log(`   ❌ Error inserting ${vehicle.reg}: ${error.message}`);
        totalSkipped++;
      } else {
        totalInserted++;
      }
    }
    
    console.log(`   ✅ Inserted from this sheet`);
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n✅ Total Inserted: ${totalInserted}`);
  console.log(`⏭️  Total Skipped: ${totalSkipped}\n`);
}

insertVehicles();
