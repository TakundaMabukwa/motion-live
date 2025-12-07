#!/usr/bin/env node

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to find column value with whitespace handling
function getColumnValue(row, ...possibleNames) {
  for (const name of possibleNames) {
    // Try exact match first
    if (row[name] !== undefined) return row[name];
    
    // Try trimmed versions
    const trimmedName = name.trim();
    if (row[trimmedName] !== undefined) return row[trimmedName];
    
    // Try finding by trimmed key match
    const foundKey = Object.keys(row).find(key => key.trim() === trimmedName);
    if (foundKey && row[foundKey] !== undefined) return row[foundKey];
  }
  return null;
}

async function importVehicles() {
  try {
    console.log('📖 Reading Excel file: new.xlsx');
    const workbook = XLSX.readFile('new.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${jsonData.length} rows in Excel file`);
    console.log('📋 Available columns:', Object.keys(jsonData[0] || {}).slice(0, 10), '...');

    const vehicles = jsonData.map((row, index) => {
      try {
        return {
          company: getColumnValue(row, 'Company Name:', 'Company Name', 'company'),
          fleet_number: getColumnValue(row, 'Fleet number:', 'Fleet number', 'fleet_number'),
          reg: getColumnValue(row, 'Reg:', 'Reg', 'reg'),
          make: getColumnValue(row, 'Make:', 'Make', 'make'),
          model: getColumnValue(row, 'Model:', 'Model', 'model'),
          vin: getColumnValue(row, 'Vin:', 'VIN:', 'VIN', 'Vin', 'vin'),
          engine: getColumnValue(row, 'Engine:', 'Engine', 'engine'),
          year: getColumnValue(row, 'Year:', 'Year', 'year'),
          colour: getColumnValue(row, 'Colour:', 'Color:', 'Colour', 'Color', 'colour'),
          skylink_trailer_unit_serial_number: getColumnValue(row, 'Skylink - Trailer Unit Serial number:'),
          skylink_trailer_unit_ip: getColumnValue(row, 'Skylink - Trailer Unit IP:'),
          sky_on_batt_ign_unit_serial_number: getColumnValue(row, 'Sky on batt - Ign unit Serial number:'),
          sky_on_batt_ign_unit_ip: getColumnValue(row, 'Sky on batt - Ign unit IP:'),
          skylink_voice_kit_serial_number: getColumnValue(row, 'Skylink - Voice kit - Serial number:'),
          skylink_voice_kit_ip: getColumnValue(row, 'Skylink - Voice kit - IP:'),
          sky_scout_12v_serial_number: getColumnValue(row, 'Sky Scout - 12v - Serial number:'),
          sky_scout_12v_ip: getColumnValue(row, 'Sky Scout - 12v - IP:'),
          sky_scout_24v_serial_number: getColumnValue(row, 'Sky Scout - 24v - Serial number:'),
          sky_scout_24v_ip: getColumnValue(row, 'Sky Scout - 24v - IP:'),
          skylink_pro_serial_number: getColumnValue(row, 'Skylink Pro - Serial number:'),
          skylink_pro_ip: getColumnValue(row, 'Skylink Pro - IP:'),
          skylink_sim_card_no: getColumnValue(row, 'Skylink sim card no:'),
          skylink_data_number: getColumnValue(row, 'Skylink data number:'),
          sky_safety: getColumnValue(row, 'Sky Safety:'),
          sky_idata: getColumnValue(row, 'Sky Idata:'),
          sky_ican: getColumnValue(row, 'Sky ICAN:'),
          industrial_panic: getColumnValue(row, 'Industrial Panic:'),
          flat_panic: getColumnValue(row, 'Flat Panic:'),
          buzzer: getColumnValue(row, 'Buzzer:'),
          tag: getColumnValue(row, 'Tag', 'Tag:'),
          tag_reader: getColumnValue(row, 'Tag Reader:', 'Tag Reader'),
          keypad: getColumnValue(row, 'Keypad:', 'Keypad'),
          keypad_waterproof: getColumnValue(row, 'Keypad (Waterproof)', 'Keypad (Waterproof):'),
          early_warning: getColumnValue(row, 'Early Warning:', 'Early Warning'),
          cia: getColumnValue(row, 'CIA:', 'CIA'),
          fm_unit: getColumnValue(row, 'FM Unit', 'FM Unit:'),
          sim_card_number: getColumnValue(row, 'Sim card number:', 'Sim card number'),
          data_number: getColumnValue(row, 'Data number:', 'Data number'),
          gps: getColumnValue(row, 'GPS:', 'GPS'),
          gsm: getColumnValue(row, 'GSM:', 'GSM'),
          tag_: getColumnValue(row, 'Tag:', 'Tag'),
          tag_reader_: getColumnValue(row, 'Tag reader:', 'Tag reader'),
          main_fm_harness: getColumnValue(row, 'Main Fm Harness:', 'Main Fm Harness'),
          beame_1: getColumnValue(row, 'Beame 1:', 'Beame 1'),
          beame_2: getColumnValue(row, 'Beame 2:', 'Beame 2'),
          beame_3: getColumnValue(row, 'Beame 3:', 'Beame 3'),
          beame_4: getColumnValue(row, 'Beame 4:', 'Beame 4'),
          beame_5: getColumnValue(row, 'Beame 5:', 'Beame 5'),
          fuel_probe_1: getColumnValue(row, 'Fuel probe 1:', 'Fuel probe 1'),
          fuel_probe_2: getColumnValue(row, 'Fuel probe 2:', 'Fuel probe 2'),
          _7m_harness_for_probe: getColumnValue(row, '7m harness for probe:', '7m harness for probe'),
          tpiece: getColumnValue(row, 'T-Piece', 'T-Piece:'),
          idata: getColumnValue(row, 'Idata:', 'Idata'),
          _1m_extension_cable: getColumnValue(row, '1m extension cable:', '1m extension cable'),
          _3m_extension_cable: getColumnValue(row, '3m extension cable:', '3m extension cable'),
          _4ch_mdvr: getColumnValue(row, '4CH MDVR:', '4CH MDVR'),
          _5ch_mdvr: getColumnValue(row, '5CH MDVR:', '5CH MDVR'),
          _8ch_mdvr: getColumnValue(row, '8CH MDVR:', '8CH MDVR'),
          a2_dash_cam: getColumnValue(row, 'A2 Dash cam:', 'A2 Dash cam'),
          a3_dash_cam_ai: getColumnValue(row, 'A3 Dash cam AI:', 'A3 Dash cam AI'),
          corpconnect_sim_no: getColumnValue(row, 'Corpconnect sim no:', 'Corpconnect sim no'),
          corpconnect_data_no: getColumnValue(row, 'Corpconnect data no:', 'Corpconnect data no'),
          sim_id: getColumnValue(row, 'SIM ID:', 'SIM ID'),
          _5m_cable_for_camera_4pin: getColumnValue(row, '5m cable for camera 4pin:', '5m cable for camera 4pin'),
          _5m_cable_6pin: getColumnValue(row, '5m cable 6pin:', '5m cable 6pin'),
          _10m_cable_for_camera_4pin: getColumnValue(row, '10m cable for camera 4pin:', '10m cable for camera 4pin'),
          a2_mec_5: getColumnValue(row, 'A2 MEC 5:', 'A2 MEC 5'),
          vw400_dome_1: getColumnValue(row, 'VW400 Dome 1:', 'VW400 Dome 1'),
          vw400_dome_2: getColumnValue(row, 'VW400 Dome 2:', 'VW400 Dome 2'),
          vw300_dakkie_dome_1: getColumnValue(row, 'VW300 Dakkie Dome 1:', 'VW300 Dakkie Dome 1'),
          vw300_dakkie_dome_2: getColumnValue(row, 'VW300 Dakkie Dome 2:', 'VW300 Dakkie Dome 2'),
          vw502_dual_lens_camera: getColumnValue(row, 'VW502 - Dual Lens Camera:', 'VW502 - Dual Lens Camera'),
          vw303_driver_facing_camera: getColumnValue(row, 'VW303 - Driver Facing Camera:', 'VW303 - Driver Facing Camera'),
          vw502f_road_facing_camera: getColumnValue(row, 'VW502F - Road Facing Camera:', 'VW502F - Road Facing Camera'),
          vw306_dvr_road_facing_for_4ch_8ch: getColumnValue(row, 'VW306 - DVR - Road Facing for 4ch & 8ch:', 'VW306 - DVR - Road Facing for 4ch &amp; 8ch:'),
          vw306m_a2_dash_cam: getColumnValue(row, 'VW306M - A2 Dash Cam:', 'VW306M - A2 Dash Cam'),
          dms01_driver_facing: getColumnValue(row, 'DMS01 - Driver Facing:', 'DMS01 - Driver Facing'),
          adas_02_road_facing: getColumnValue(row, 'ADAS 02 - Road Facing', 'ADAS 02 - Road Facing:'),
          vw100ip_driver_facing_ip: getColumnValue(row, 'VW-100IP - Driver Facing IP:', 'VW-100IP - Driver Facing IP'),
          sd_card_1tb: getColumnValue(row, 'SD Card 1TB:', 'SD Card 1TB'),
          sd_card_2tb: getColumnValue(row, 'SD Card 2TB:', 'SD Card 2TB'),
          sd_card_480gb: getColumnValue(row, 'SD Card 480GB:', 'SD Card 480GB'),
          sd_card_256gb: getColumnValue(row, 'SD Card 256GB:', 'SD Card 256GB'),
          sd_card_512gb: getColumnValue(row, 'SD Card 512GB:', 'SD Card 512GB'),
          sd_card_250gb: getColumnValue(row, 'SD Card 250GB:', 'SD Card 250GB'),
          mic: getColumnValue(row, 'Mic:', 'Mic'),
          speaker: getColumnValue(row, 'Speaker:', 'Speaker'),
          pfk_main_unit: getColumnValue(row, 'PFK Main Unit:', 'PFK Main Unit'),
          pfk_corpconnect_sim_number: getColumnValue(row, 'PFK Corpconnect sim number:', 'PFK Corpconnect sim number'),
          pfk_corpconnect_data_number: getColumnValue(row, 'PFK Corpconnect data number:', 'PFK Corpconnect data number'),
          breathaloc: getColumnValue(row, 'Breathaloc:', 'Breathaloc'),
          pfk_road_facing: getColumnValue(row, 'PFK Road Facing:', 'PFK Road Facing'),
          pfk_driver_facing: getColumnValue(row, 'PFK Driver Facing:', 'PFK Driver Facing'),
          pfk_dome_1: getColumnValue(row, 'PFK Dome 1:', 'PFK Dome 1'),
          pfk_dome_2: getColumnValue(row, 'PFK Dome 2:', 'PFK Dome 2'),
          pfk_5m: getColumnValue(row, 'PFK 5m:', 'PFK 5m'),
          pfk_10m: getColumnValue(row, 'PFK 10m:', 'PFK 10m'),
          pfk_15m: getColumnValue(row, 'PFK 15m:', 'PFK 15m'),
          pfk_20m: getColumnValue(row, 'PFK 20m:', 'PFK 20m'),
          roller_door_switches: getColumnValue(row, 'Roller door switches:', 'Roller door switches'),
          account_number: getColumnValue(row, 'Account number:', 'Account number'),
          skylink_trailer_unit_rental: getColumnValue(row, 'Skylink - Trailer Unit Rental:', 'Skylink - Trailer Unit Rental'),
          skylink_trailer_sub: getColumnValue(row, 'Skylink - Trailer Sub:', 'Skylink - Trailer Sub'),
          sky_on_batt_ign_rental: getColumnValue(row, 'Sky on batt - Ign Rental:', 'Sky on batt - Ign Rental'),
          sky_on_batt_sub: getColumnValue(row, 'Sky on batt - Sub:', 'Sky on batt - Sub'),
          skylink_voice_kit_rental: getColumnValue(row, 'Skylink - Voice kit - Rental:', 'Skylink - Voice kit - Rental'),
          skylink_voice_kit_sub: getColumnValue(row, 'Skylink - Voice kit - Sub:', 'Skylink - Voice kit - Sub'),
          sky_scout_12v_rental: getColumnValue(row, 'Sky Scout - 12v - Rental:', 'Sky Scout - 12v - Rental'),
          sky_scout_12v_sub: getColumnValue(row, 'Sky Scout - 12v - Sub:', 'Sky Scout - 12v - Sub'),
          sky_scout_24v_rental: getColumnValue(row, 'Sky Scout - 24v - Rental:', 'Sky Scout - 24v - Rental'),
          sky_scout_24v_sub: getColumnValue(row, 'Sky Scout - 24v - Sub:', 'Sky Scout - 24v - Sub'),
          skylink_pro_rental: getColumnValue(row, 'Skylink Pro - Rental:', 'Skylink Pro - Rental'),
          skylink_pro_sub: getColumnValue(row, 'Skylink Pro - Sub:', 'Skylink Pro - Sub'),
          sky_idata_rental: getColumnValue(row, 'Sky Idata Rental:', 'Sky Idata Rental'),
          sky_ican_rental: getColumnValue(row, 'Sky ICAN Rental:', 'Sky ICAN Rental'),
          industrial_panic_rental: getColumnValue(row, 'Industrial Panic Rental:', 'Industrial Panic Rental'),
          flat_panic_rental: getColumnValue(row, 'Flat Panic Rental:', 'Flat Panic Rental'),
          buzzer_rental: getColumnValue(row, 'Buzzer Rental:', 'Buzzer Rental'),
          tag_rental: getColumnValue(row, 'Tag Rental:', 'Tag Rental'),
          tag_reader_rental: getColumnValue(row, 'Tag Reader Rental:', 'Tag Reader Rental'),
          keypad_rental: getColumnValue(row, 'Keypad Rental:', 'Keypad Rental'),
          early_warning_rental: getColumnValue(row, 'Early Warning Rental:', 'Early Warning Rental'),
          cia_rental: getColumnValue(row, 'CIA Rental:', 'CIA Rental'),
          fm_unit_rental: getColumnValue(row, 'FM Unit Rental:', 'FM Unit Rental'),
          fm_unit_sub: getColumnValue(row, 'FM Unit Sub:', 'FM Unit Sub'),
          gps_rental: getColumnValue(row, 'GPS Rental:', 'GPS Rental'),
          gsm_rental: getColumnValue(row, 'GSM Rental:', 'GSM Rental'),
          tag_rental_: getColumnValue(row, 'Tag Rental:', 'Tag Rental'),
          tag_reader_rental_: getColumnValue(row, 'Tag reader Rental:', 'Tag reader Rental'),
          main_fm_harness_rental: getColumnValue(row, 'Main Fm Harness Rental:', 'Main Fm Harness Rental'),
          beame_1_rental: getColumnValue(row, 'Beame 1 Rental:', 'Beame 1 Rental'),
          beame_1_sub: getColumnValue(row, 'Beame 1 Sub:', 'Beame 1 Sub'),
          beame_2_rental: getColumnValue(row, 'Beame 2 Rental:', 'Beame 2 Rental'),
          beame_2_sub: getColumnValue(row, 'Beame 2 Sub:', 'Beame 2 Sub'),
          beame_3_rental: getColumnValue(row, 'Beame 3 Rental:', 'Beame 3 Rental'),
          beame_3_sub: getColumnValue(row, 'Beame 3 Sub:', 'Beame 3 Sub'),
          beame_4_rental: getColumnValue(row, 'Beame 4 Rental:', 'Beame 4 Rental'),
          beame_4_sub: getColumnValue(row, 'Beame 4 Sub:', 'Beame 4 Sub'),
          beame_5_rental: getColumnValue(row, 'Beame 5 Rental:', 'Beame 5 Rental'),
          beame_5_sub: getColumnValue(row, 'Beame 5 Sub:', 'Beame 5 Sub'),
          single_probe_rental: getColumnValue(row, 'Single Probe Rental:', 'Single Probe Rental'),
          single_probe_sub: getColumnValue(row, 'Single Probe Sub:', 'Single Probe Sub'),
          dual_probe_rental: getColumnValue(row, 'Dual Probe Rental:', 'Dual Probe Rental'),
          dual_probe_sub: getColumnValue(row, 'Dual Probe Sub:', 'Dual Probe Sub'),
          _7m_harness_for_probe_rental: getColumnValue(row, '7m harness for probe Rental:', '7m harness for probe Rental'),
          tpiece_rental: getColumnValue(row, 'T-Piece Rental:', 'T-Piece Rental'),
          idata_rental: getColumnValue(row, 'Idata Rental:', 'Idata Rental'),
          _1m_extension_cable_rental: getColumnValue(row, '1m extension cable Rental:', '1m extension cable Rental'),
          _3m_extension_cable_rental: getColumnValue(row, '3m extension cable Rental:', '3m extension cable Rental'),
          _4ch_mdvr_rental: getColumnValue(row, '4CH MDVR Rental:', '4CH MDVR Rental'),
          _4ch_mdvr_sub: getColumnValue(row, '4CH MDVR Sub:', '4CH MDVR Sub'),
          _5ch_mdvr_rental: getColumnValue(row, '5CH MDVR Rental:', '5CH MDVR Rental'),
          _5ch_mdvr_sub: getColumnValue(row, '5CH MDVR Sub:', '5CH MDVR Sub'),
          _8ch_mdvr_rental: getColumnValue(row, '8CH MDVR Rental:', '8CH MDVR Rental'),
          _8ch_mdvr_sub: getColumnValue(row, '8CH MDVR Sub:', '8CH MDVR Sub'),
          a2_dash_cam_rental: getColumnValue(row, 'A2 Dash cam Rental:', 'A2 Dash cam Rental'),
          a2_dash_cam_sub: getColumnValue(row, 'A2 Dash cam Sub:', 'A2 Dash cam Sub'),
          a3_dash_cam_ai_rental: getColumnValue(row, 'A3 Dash cam AI Rental:', 'A3 Dash cam AI Rental'),
          _5m_cable_for_camera_4pin_rental: getColumnValue(row, '5m cable for camera 4pin Rental:', '5m cable for camera 4pin Rental'),
          _5m_cable_6pin_rental: getColumnValue(row, '5m cable 6pin Rental:', '5m cable 6pin Rental'),
          _10m_cable_for_camera_4pin_rental: getColumnValue(row, '10m cable for camera 4pin Rental:', '10m cable for camera 4pin Rental'),
          a2_mec_5_rental: getColumnValue(row, 'A2 MEC 5 Rental:', 'A2 MEC 5 Rental'),
          vw400_dome_1_rental: getColumnValue(row, 'VW400 Dome 1 Rental:', 'VW400 Dome 1 Rental'),
          vw400_dome_2_rental: getColumnValue(row, 'VW400 Dome 2 Rental:', 'VW400 Dome 2 Rental'),
          vw300_dakkie_dome_1_rental: getColumnValue(row, 'VW300 Dakkie Dome 1 Rental:', 'VW300 Dakkie Dome 1 Rental'),
          vw300_dakkie_dome_2_rental: getColumnValue(row, 'VW300 Dakkie Dome 2 Rental:', 'VW300 Dakkie Dome 2 Rental'),
          vw502_dual_lens_camera_rental: getColumnValue(row, 'VW502 - Dual Lens Camera Rental:', 'VW502 - Dual Lens Camera Rental'),
          vw303_driver_facing_camera_rental: getColumnValue(row, 'VW303 - Driver Facing Camera Rental:', 'VW303 - Driver Facing Camera Rental'),
          vw502f_road_facing_camera_rental: getColumnValue(row, 'VW502F - Road Facing Camera Rental:', 'VW502F - Road Facing Camera Rental'),
          vw306_dvr_road_facing_for_4ch_8ch_rental: getColumnValue(row, 'VW306 - DVR - Road Facing for 4ch & 8ch Rental:', 'VW306 - DVR - Road Facing for 4ch &amp; 8ch Rental:'),
          vw306m_a2_dash_cam_rental: getColumnValue(row, 'VW306M - A2 Dash Cam Rental:', 'VW306M - A2 Dash Cam Rental'),
          dms01_driver_facing_rental: getColumnValue(row, 'DMS01 - Driver Facing Rental:', 'DMS01 - Driver Facing Rental'),
          adas_02_road_facing_rental: getColumnValue(row, 'ADAS 02 - Road Facing Rental:', 'ADAS 02 - Road Facing Rental'),
          vw100ip_driver_facing_rental: getColumnValue(row, 'VW-100IP - Driver Facing Rental:', 'VW-100IP - Driver Facing Rental'),
          sd_card_1tb_rental: getColumnValue(row, 'SD Card 1TB Rental:', 'SD Card 1TB Rental'),
          sd_card_2tb_rental: getColumnValue(row, 'SD Card 2TB Rental:', 'SD Card 2TB Rental'),
          sd_card_480gb_rental: getColumnValue(row, 'SD Card 480GB Rental:', 'SD Card 480GB Rental'),
          sd_card_256gb_rental: getColumnValue(row, 'SD Card 256GB Rental:', 'SD Card 256GB Rental'),
          sd_card_512gb_rental: getColumnValue(row, 'SD Card 512GB Rental:', 'SD Card 512GB Rental'),
          sd_card_250gb_rental: getColumnValue(row, 'SD Card 250GB Rental:', 'SD Card 250GB Rental'),
          mic_rental: getColumnValue(row, 'Mic Rental:', 'Mic Rental'),
          speaker_rental: getColumnValue(row, 'Speaker Rental:', 'Speaker Rental'),
          pfk_main_unit_rental: getColumnValue(row, 'PFK Main Unit Rental:', 'PFK Main Unit Rental'),
          pfk_main_unit_sub: getColumnValue(row, 'PFK Main Unit Sub:', 'PFK Main Unit Sub'),
          breathaloc_rental: getColumnValue(row, 'Breathaloc Rental:', 'Breathaloc Rental'),
          pfk_road_facing_rental: getColumnValue(row, 'PFK Road Facing Rental:', 'PFK Road Facing Rental'),
          pfk_driver_facing_rental: getColumnValue(row, 'PFK Driver Facing Rental:', 'PFK Driver Facing Rental'),
          pfk_dome_1_rental: getColumnValue(row, 'PFK Dome 1 Rental:', 'PFK Dome 1 Rental'),
          pfk_dome_2_rental: getColumnValue(row, 'PFK Dome 2 Rental:', 'PFK Dome 2 Rental'),
          pfk_5m_rental: getColumnValue(row, 'PFK 5m Rental:', 'PFK 5m Rental'),
          pfk_10m_rental: getColumnValue(row, 'PFK 10m Rental:', 'PFK 10m Rental'),
          pfk_15m_rental: getColumnValue(row, 'PFK 15m Rental:', 'PFK 15m Rental'),
          pfk_20m_rental: getColumnValue(row, 'PFK 20m Rental:', 'PFK 20m Rental'),
          roller_door_switches_rental: getColumnValue(row, 'Roller door switches Rental:', 'Roller door switches Rental'),
          consultancy: getColumnValue(row, 'Consultancy:', 'Consultancy'),
          roaming: getColumnValue(row, 'Roaming:', 'Roaming'),
          maintenance: getColumnValue(row, 'Maintenance:', 'Maintenance'),
          after_hours: getColumnValue(row, 'After hours:', 'After hours'),
          controlroom: getColumnValue(row, 'Controlroom:', 'Controlroom'),
          total_rental: parseFloat(getColumnValue(row, 'Total Rental:', 'Total Rental')) || null,
          total_sub: parseFloat(getColumnValue(row, 'Total Sub:', 'Total Sub')) || null,
          total_rental_sub: parseFloat(getColumnValue(row, 'Total Rental & Sub:', 'Total Rental & Sub', 'Total Rental &amp; Sub:')) || null,
        };
      } catch (error) {
        console.error(`❌ Error processing row ${index + 1}:`, error.message);
        return null;
      }
    }).filter(Boolean);

    console.log(`✅ Processed ${vehicles.length} valid vehicles`);

    if (vehicles.length === 0) {
      console.log('❌ No valid vehicles to import');
      return;
    }

    // Insert in batches
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < vehicles.length; i += batchSize) {
      const batch = vehicles.slice(i, i + batchSize);
      const batchNum = Math.floor(i/batchSize) + 1;
      
      console.log(`📤 Inserting batch ${batchNum}/${Math.ceil(vehicles.length/batchSize)}...`);
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`❌ Batch ${batchNum} error:`, error.message);
        
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('💡 Run the SQL in scripts/add-missing-columns.sql to add missing columns');
          return;
        }
      } else {
        inserted += data.length;
        console.log(`✅ Batch ${batchNum}: ${data.length} records inserted`);
      }
    }

    console.log(`🎉 Successfully imported ${inserted} vehicles`);

  } catch (error) {
    console.error('💥 Import failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  importVehicles();
}