require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const companies = require('./companies.json');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const companyMap = new Map();
companies.forEach(c => {
  companyMap.set(c.company.toLowerCase().trim(), c.cost_code);
});

function cleanNumeric(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[R,\s]/g, '').replace(/\.{2,}/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

async function insertVehicles() {
  const workbook = XLSX.readFile('scripts/SkyFlo Updated list.xlsx');
  console.log('Sheet names:', workbook.SheetNames);
  
  let totalInserted = 0;
  let totalFailed = 0;

  for (const sheetName of workbook.SheetNames) {
    console.log(`\n=== Processing sheet: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    if (data.length === 0) {
      console.log('No data in sheet, skipping...');
      continue;
    }

    console.log('First row keys:', Object.keys(data[0]));
    
    // Get company name from first row's 'Company Name: ' field
    const companyName = data[0]['Company Name: '] || data[0]['Company Name'] || '';
    const costCode = companyMap.get(companyName.toLowerCase().trim());
    
    console.log(`Sheet: ${sheetName}`);
    console.log(`Company from data: ${companyName}`);
    console.log(`Cost Code: ${costCode || 'NOT FOUND'}`);
    console.log(`Vehicles: ${data.length}`);

    if (!costCode) {
      console.log('⚠️  No matching cost code, skipping sheet');
      continue;
    }

    const vehicles = data.map(row => ({
      company: companyName,
      new_account_number: costCode,
      branch: row['Branch'] || row['Branch: '] || null,
      fleet_number: row['Fleet number'] || row['Fleet number: '] || null,
      reg: row['Reg'] || row['Reg: '] || null,
      make: row['Make'] || row['Make: '] || null,
      model: row['Model'] || row['Model: '] || null,
      vin: row['VIN'] || row['VIN: '] || null,
      engine: row['Engine'] || row['Engine: '] || null,
      year: row['Year'] || row['Year: '] || null,
      colour: row['Colour'] || row['Colour: '] || null,
      skylink_trailer_unit_serial_number: row['Skylink Trailer Unit - Serial number'] || row['Skylink Trailer Unit - Serial number:'] || null,
      skylink_trailer_unit_ip: row['Skylink Trailer Unit - IP'] || row['Skylink Trailer Unit - IP: '] || null,
      sky_on_batt_ign_unit_serial_number: row['Sky On Batt Ign - Serial number'] || row['Sky On Batt Ign - Serial number:'] || null,
      sky_on_batt_ign_unit_ip: row['Sky On Batt Ign - IP'] || row['Sky On Batt Ign - IP: '] || null,
      skylink_voice_kit_serial_number: row['Skylink Voice Kit - Serial number'] || row['Skylink Voice Kit - Serial number:'] || null,
      skylink_voice_kit_ip: row['Skylink Voice Kit - IP'] || row['Skylink Voice Kit - IP: '] || null,
      sky_scout_12v_serial_number: row['Sky Scout 12V - Serial number'] || row['Sky Scout 12V - Serial number:'] || null,
      sky_scout_12v_ip: row['Sky Scout 12V - IP'] || row['Sky Scout 12V - IP: '] || null,
      sky_scout_24v_serial_number: row['Sky Scout 24V - Serial number'] || row['Sky Scout 24V - Serial number:'] || null,
      sky_scout_24v_ip: row['Sky Scout 24V - IP'] || row['Sky Scout 24V - IP: '] || null,
      skylink_pro_serial_number: row['Skylink Pro - Serial number'] || row['Skylink Pro - Serial number:'] || null,
      skylink_pro_ip: row['Skylink Pro - IP'] || row['Skylink Pro - IP: '] || null,
      skylink_sim_card_no: row['Skylink sim card no'] || row['Skylink sim card no: '] || null,
      skylink_data_number: row['Skylink data number'] || row['Skylink data number: '] || null,
      sky_safety: row['Sky Safety'] || row['Sky Safety: '] || null,
      sky_idata: row['Sky iData'] || row['Sky iData: '] || null,
      sky_ican: row['Sky iCan'] || row['Sky iCan: '] || null,
      industrial_panic: row['Industrial Panic'] || row['Industrial Panic: '] || null,
      flat_panic: row['Flat Panic'] || row['Flat Panic: '] || null,
      buzzer: row['Buzzer'] || row['Buzzer: '] || null,
      tag: row['Tag'] || row['Tag: '] || null,
      tag_reader: row['Tag Reader'] || row['Tag Reader: '] || null,
      keypad: row['Keypad'] || row['Keypad: '] || null,
      keypad_waterproof: row['Keypad Waterproof'] || row['Keypad Waterproof: '] || null,
      early_warning: row['Early Warning'] || row['Early Warning: '] || null,
      cia: row['CIA'] || row['CIA: '] || null,
      fm_unit: row['FM Unit - Serial number'] || row['FM Unit - Serial number:'] || null,
      sim_card_number: row['Sim card number'] || row['Sim card number: '] || null,
      data_number: row['Data number'] || row['Data number: '] || null,
      gps: row['GPS'] || row['GPS: '] || null,
      gsm: row['GSM'] || row['GSM: '] || null,
      main_fm_harness: row['Main FM Harness'] || row['Main FM Harness: '] || null,
      beame_1: row['Beame 1'] || row['Beame 1: '] || null,
      beame_2: row['Beame 2'] || row['Beame 2: '] || null,
      beame_3: row['Beame 3'] || row['Beame 3: '] || null,
      beame_4: row['Beame 4'] || row['Beame 4: '] || null,
      beame_5: row['Beame 5'] || row['Beame 5: '] || null,
      fuel_probe_1: row['Fuel Probe 1'] || row['Fuel Probe 1: '] || null,
      fuel_probe_2: row['Fuel Probe 2'] || row['Fuel Probe 2: '] || null,
      _7m_harness_for_probe: row['7m Harness for Probe'] || row['7m Harness for Probe: '] || null,
      tpiece: row['Tpiece'] || row['Tpiece: '] || null,
      idata: row['iData'] || row['iData: '] || null,
      _1m_extension_cable: row['1m Extension Cable'] || row['1m Extension Cable: '] || null,
      _3m_extension_cable: row['3m Extension Cable'] || row['3m Extension Cable: '] || null,
      _4ch_mdvr: row['4CH MDVR - Serial number'] || row['4CH MDVR - Serial number:'] || null,
      _5ch_mdvr: row['5CH MDVR - Serial number'] || row['5CH MDVR - Serial number:'] || null,
      _8ch_mdvr: row['8CH MDVR - Serial number'] || row['8CH MDVR - Serial number:'] || null,
      a2_dash_cam: row['A2 Dash Cam - Serial number'] || row['A2 Dash Cam - Serial number:'] || null,
      a3_dash_cam_ai: row['A3 Dash Cam AI - Serial number'] || row['A3 Dash Cam AI - Serial number:'] || null,
      corpconnect_sim_no: row['CorpConnect Sim No'] || row['CorpConnect Sim No: '] || null,
      corpconnect_data_no: row['CorpConnect Data No'] || row['CorpConnect Data No: '] || null,
      sim_id: row['Sim ID'] || row['Sim ID: '] || null,
      _5m_cable_for_camera_4pin: row['5m Cable for Camera 4pin'] || row['5m Cable for Camera 4pin: '] || null,
      _5m_cable_6pin: row['5m Cable 6pin'] || row['5m Cable 6pin: '] || null,
      _10m_cable_for_camera_4pin: row['10m Cable for Camera 4pin'] || row['10m Cable for Camera 4pin: '] || null,
      a2_mec_5: row['A2 MEC 5'] || row['A2 MEC 5: '] || null,
      vw400_dome_1: row['VW400 Dome 1'] || row['VW400 Dome 1: '] || null,
      vw400_dome_2: row['VW400 Dome 2'] || row['VW400 Dome 2: '] || null,
      vw300_dakkie_dome_1: row['VW300 Dakkie Dome 1'] || row['VW300 Dakkie Dome 1: '] || null,
      vw300_dakkie_dome_2: row['VW300 Dakkie Dome 2'] || row['VW300 Dakkie Dome 2: '] || null,
      vw502_dual_lens_camera: row['VW502 Dual Lens Camera'] || row['VW502 Dual Lens Camera: '] || null,
      vw303_driver_facing_camera: row['VW303 Driver Facing Camera'] || row['VW303 Driver Facing Camera: '] || null,
      vw502f_road_facing_camera: row['VW502F Road Facing Camera'] || row['VW502F Road Facing Camera: '] || null,
      vw306_dvr_road_facing_for_4ch_8ch: row['VW306 DVR Road Facing for 4CH/8CH'] || row['VW306 DVR Road Facing for 4CH/8CH: '] || null,
      vw306m_a2_dash_cam: row['VW306M A2 Dash Cam'] || row['VW306M A2 Dash Cam: '] || null,
      dms01_driver_facing: row['DMS01 Driver Facing'] || row['DMS01 Driver Facing: '] || null,
      adas_02_road_facing: row['ADAS 02 Road Facing'] || row['ADAS 02 Road Facing: '] || null,
      vw100ip_driver_facing_ip: row['VW100IP Driver Facing IP'] || row['VW100IP Driver Facing IP: '] || null,
      sd_card_1tb: row['SD Card 1TB'] || row['SD Card 1TB: '] || null,
      sd_card_2tb: row['SD Card 2TB'] || row['SD Card 2TB: '] || null,
      sd_card_480gb: row['SD Card 480GB'] || row['SD Card 480GB: '] || null,
      sd_card_256gb: row['SD Card 256GB'] || row['SD Card 256GB: '] || null,
      sd_card_512gb: row['SD Card 512GB'] || row['SD Card 512GB: '] || null,
      sd_card_250gb: row['SD Card 250GB'] || row['SD Card 250GB: '] || null,
      mic: row['Mic'] || row['Mic: '] || null,
      speaker: row['Speaker'] || row['Speaker: '] || null,
      pfk_main_unit: row['PFK Main Unit - Serial number'] || row['PFK Main Unit - Serial number:'] || null,
      pfk_corpconnect_sim_number: row['PFK CorpConnect Sim Number'] || row['PFK CorpConnect Sim Number: '] || null,
      pfk_corpconnect_data_number: row['PFK CorpConnect Data Number'] || row['PFK CorpConnect Data Number: '] || null,
      breathaloc: row['Breathaloc'] || row['Breathaloc: '] || null,
      pfk_road_facing: row['PFK Road Facing'] || row['PFK Road Facing: '] || null,
      pfk_driver_facing: row['PFK Driver Facing'] || row['PFK Driver Facing: '] || null,
      pfk_dome_1: row['PFK Dome 1'] || row['PFK Dome 1: '] || null,
      pfk_dome_2: row['PFK Dome 2'] || row['PFK Dome 2: '] || null,
      pfk_5m: row['PFK 5m'] || row['PFK 5m: '] || null,
      pfk_10m: row['PFK 10m'] || row['PFK 10m: '] || null,
      pfk_15m: row['PFK 15m'] || row['PFK 15m: '] || null,
      pfk_20m: row['PFK 20m'] || row['PFK 20m: '] || null,
      roller_door_switches: row['Roller Door Switches'] || row['Roller Door Switches: '] || null,
      account_number: row['Account Number'] || row['Account Number: '] || null,
      skylink_trailer_unit_rental: cleanNumeric(row['Skylink Trailer Unit - Rental'] || row['Skylink Trailer Unit - Rental:']),
      skylink_trailer_sub: cleanNumeric(row['Skylink Trailer - Sub'] || row['Skylink Trailer - Sub: ']),
      sky_on_batt_ign_rental: cleanNumeric(row['Sky On Batt Ign - Rental'] || row['Sky On Batt Ign - Rental:']),
      sky_on_batt_sub: cleanNumeric(row['Sky On Batt - Sub'] || row['Sky On Batt - Sub: ']),
      skylink_voice_kit_rental: cleanNumeric(row['Skylink Voice Kit - Rental'] || row['Skylink Voice Kit - Rental:']),
      skylink_voice_kit_sub: cleanNumeric(row['Skylink Voice Kit - Sub'] || row['Skylink Voice Kit - Sub: ']),
      sky_scout_12v_rental: cleanNumeric(row['Sky Scout 12V - Rental'] || row['Sky Scout 12V - Rental:']),
      sky_scout_12v_sub: cleanNumeric(row['Sky Scout 12V - Sub'] || row['Sky Scout 12V - Sub: ']),
      sky_scout_24v_rental: cleanNumeric(row['Sky Scout 24V - Rental'] || row['Sky Scout 24V - Rental:']),
      sky_scout_24v_sub: cleanNumeric(row['Sky Scout 24V - Sub'] || row['Sky Scout 24V - Sub: ']),
      skylink_pro_rental: cleanNumeric(row['Skylink Pro - Rental'] || row['Skylink Pro - Rental:']),
      skylink_pro_sub: cleanNumeric(row['Skylink Pro - Sub'] || row['Skylink Pro - Sub: ']),
      sky_idata_rental: cleanNumeric(row['Sky iData - Rental'] || row['Sky iData - Rental:']),
      sky_ican_rental: cleanNumeric(row['Sky iCan - Rental'] || row['Sky iCan - Rental:']),
      industrial_panic_rental: cleanNumeric(row['Industrial Panic - Rental'] || row['Industrial Panic - Rental:']),
      flat_panic_rental: cleanNumeric(row['Flat Panic - Rental'] || row['Flat Panic - Rental:']),
      buzzer_rental: cleanNumeric(row['Buzzer - Rental'] || row['Buzzer - Rental:']),
      fm_unit_rental: cleanNumeric(row['FM Unit - Rental'] || row['FM Unit - Rental:']),
      fm_unit_sub: cleanNumeric(row['FM Unit - Sub'] || row['FM Unit - Sub: ']),
      gps_rental: cleanNumeric(row['GPS - Rental'] || row['GPS - Rental:']),
      gsm_rental: cleanNumeric(row['GSM - Rental'] || row['GSM - Rental:']),
      tag_rental: cleanNumeric(row['Tag - Rental'] || row['Tag - Rental:']),
      tag_reader_rental: cleanNumeric(row['Tag Reader - Rental'] || row['Tag Reader - Rental:']),
      main_fm_harness_rental: cleanNumeric(row['Main FM Harness - Rental'] || row['Main FM Harness - Rental:']),
      beame_1_rental: cleanNumeric(row['Beame 1 - Rental'] || row['Beame 1 - Rental:']),
      beame_1_sub: cleanNumeric(row['Beame 1 - Sub'] || row['Beame 1 - Sub: ']),
      beame_2_rental: cleanNumeric(row['Beame 2 - Rental'] || row['Beame 2 - Rental:']),
      beame_2_sub: cleanNumeric(row['Beame 2 - Sub'] || row['Beame 2 - Sub: ']),
      beame_3_rental: cleanNumeric(row['Beame 3 - Rental'] || row['Beame 3 - Rental:']),
      beame_3_sub: cleanNumeric(row['Beame 3 - Sub'] || row['Beame 3 - Sub: ']),
      beame_4_rental: cleanNumeric(row['Beame 4 - Rental'] || row['Beame 4 - Rental:']),
      beame_4_sub: cleanNumeric(row['Beame 4 - Sub'] || row['Beame 4 - Sub: ']),
      beame_5_rental: cleanNumeric(row['Beame 5 - Rental'] || row['Beame 5 - Rental:']),
      beame_5_sub: cleanNumeric(row['Beame 5 - Sub'] || row['Beame 5 - Sub: ']),
      single_probe_rental: cleanNumeric(row['Single Probe - Rental'] || row['Single Probe - Rental:']),
      single_probe_sub: cleanNumeric(row['Single Probe - Sub'] || row['Single Probe - Sub: ']),
      dual_probe_rental: cleanNumeric(row['Dual Probe - Rental'] || row['Dual Probe - Rental:']),
      dual_probe_sub: cleanNumeric(row['Dual Probe - Sub'] || row['Dual Probe - Sub: ']),
      _7m_harness_for_probe_rental: cleanNumeric(row['7m Harness for Probe - Rental'] || row['7m Harness for Probe - Rental:']),
      tpiece_rental: cleanNumeric(row['Tpiece - Rental'] || row['Tpiece - Rental:']),
      idata_rental: cleanNumeric(row['iData - Rental'] || row['iData - Rental:']),
      _1m_extension_cable_rental: cleanNumeric(row['1m Extension Cable - Rental'] || row['1m Extension Cable - Rental:']),
      _3m_extension_cable_rental: cleanNumeric(row['3m Extension Cable - Rental'] || row['3m Extension Cable - Rental:']),
      _4ch_mdvr_rental: cleanNumeric(row['4CH MDVR - Rental'] || row['4CH MDVR - Rental:']),
      _4ch_mdvr_sub: cleanNumeric(row['4CH MDVR - Sub'] || row['4CH MDVR - Sub: ']),
      _5ch_mdvr_rental: cleanNumeric(row['5CH MDVR - Rental'] || row['5CH MDVR - Rental:']),
      _5ch_mdvr_sub: cleanNumeric(row['5CH MDVR - Sub'] || row['5CH MDVR - Sub: ']),
      _8ch_mdvr_rental: cleanNumeric(row['8CH MDVR - Rental'] || row['8CH MDVR - Rental:']),
      _8ch_mdvr_sub: cleanNumeric(row['8CH MDVR - Sub'] || row['8CH MDVR - Sub: ']),
      a2_dash_cam_rental: cleanNumeric(row['A2 Dash Cam - Rental'] || row['A2 Dash Cam - Rental:']),
      a2_dash_cam_sub: cleanNumeric(row['A2 Dash Cam - Sub'] || row['A2 Dash Cam - Sub: ']),
      a3_dash_cam_ai_rental: cleanNumeric(row['A3 Dash Cam AI - Rental'] || row['A3 Dash Cam AI - Rental:']),
      _5m_cable_for_camera_4pin_rental: cleanNumeric(row['5m Cable for Camera 4pin - Rental'] || row['5m Cable for Camera 4pin - Rental:']),
      _5m_cable_6pin_rental: cleanNumeric(row['5m Cable 6pin - Rental'] || row['5m Cable 6pin - Rental:']),
      _10m_cable_for_camera_4pin_rental: cleanNumeric(row['10m Cable for Camera 4pin - Rental'] || row['10m Cable for Camera 4pin - Rental:']),
      a2_mec_5_rental: cleanNumeric(row['A2 MEC 5 - Rental'] || row['A2 MEC 5 - Rental:']),
      vw400_dome_1_rental: cleanNumeric(row['VW400 Dome 1 - Rental'] || row['VW400 Dome 1 - Rental:']),
      vw400_dome_2_rental: cleanNumeric(row['VW400 Dome 2 - Rental'] || row['VW400 Dome 2 - Rental:']),
      vw300_dakkie_dome_1_rental: cleanNumeric(row['VW300 Dakkie Dome 1 - Rental'] || row['VW300 Dakkie Dome 1 - Rental:']),
      vw300_dakkie_dome_2_rental: cleanNumeric(row['VW300 Dakkie Dome 2 - Rental'] || row['VW300 Dakkie Dome 2 - Rental:']),
      vw502_dual_lens_camera_rental: cleanNumeric(row['VW502 Dual Lens Camera - Rental'] || row['VW502 Dual Lens Camera - Rental:']),
      vw303_driver_facing_camera_rental: cleanNumeric(row['VW303 Driver Facing Camera - Rental'] || row['VW303 Driver Facing Camera - Rental:']),
      vw502f_road_facing_camera_rental: cleanNumeric(row['VW502F Road Facing Camera - Rental'] || row['VW502F Road Facing Camera - Rental:']),
      vw306_dvr_road_facing_for_4ch_8ch_rental: cleanNumeric(row['VW306 DVR Road Facing for 4CH/8CH - Rental'] || row['VW306 DVR Road Facing for 4CH/8CH - Rental:']),
      vw306m_a2_dash_cam_rental: cleanNumeric(row['VW306M A2 Dash Cam - Rental'] || row['VW306M A2 Dash Cam - Rental:']),
      dms01_driver_facing_rental: cleanNumeric(row['DMS01 Driver Facing - Rental'] || row['DMS01 Driver Facing - Rental:']),
      adas_02_road_facing_rental: cleanNumeric(row['ADAS 02 Road Facing - Rental'] || row['ADAS 02 Road Facing - Rental:']),
      vw100ip_driver_facing_rental: cleanNumeric(row['VW100IP Driver Facing - Rental'] || row['VW100IP Driver Facing - Rental:']),
      sd_card_1tb_rental: cleanNumeric(row['SD Card 1TB - Rental'] || row['SD Card 1TB - Rental:']),
      sd_card_2tb_rental: cleanNumeric(row['SD Card 2TB - Rental'] || row['SD Card 2TB - Rental:']),
      sd_card_480gb_rental: cleanNumeric(row['SD Card 480GB - Rental'] || row['SD Card 480GB - Rental:']),
      sd_card_256gb_rental: cleanNumeric(row['SD Card 256GB - Rental'] || row['SD Card 256GB - Rental:']),
      sd_card_512gb_rental: cleanNumeric(row['SD Card 512GB - Rental'] || row['SD Card 512GB - Rental:']),
      sd_card_250gb_rental: cleanNumeric(row['SD Card 250GB - Rental'] || row['SD Card 250GB - Rental:']),
      mic_rental: cleanNumeric(row['Mic - Rental'] || row['Mic - Rental:']),
      speaker_rental: cleanNumeric(row['Speaker - Rental'] || row['Speaker - Rental:']),
      pfk_main_unit_rental: cleanNumeric(row['PFK Main Unit - Rental'] || row['PFK Main Unit - Rental:']),
      pfk_main_unit_sub: cleanNumeric(row['PFK Main Unit - Sub'] || row['PFK Main Unit - Sub: ']),
      breathaloc_rental: cleanNumeric(row['Breathaloc - Rental'] || row['Breathaloc - Rental:']),
      pfk_road_facing_rental: cleanNumeric(row['PFK Road Facing - Rental'] || row['PFK Road Facing - Rental:']),
      pfk_driver_facing_rental: cleanNumeric(row['PFK Driver Facing - Rental'] || row['PFK Driver Facing - Rental:']),
      pfk_dome_1_rental: cleanNumeric(row['PFK Dome 1 - Rental'] || row['PFK Dome 1 - Rental:']),
      pfk_dome_2_rental: cleanNumeric(row['PFK Dome 2 - Rental'] || row['PFK Dome 2 - Rental:']),
      pfk_5m_rental: cleanNumeric(row['PFK 5m - Rental'] || row['PFK 5m - Rental:']),
      pfk_10m_rental: cleanNumeric(row['PFK 10m - Rental'] || row['PFK 10m - Rental:']),
      pfk_15m_rental: cleanNumeric(row['PFK 15m - Rental'] || row['PFK 15m - Rental:']),
      pfk_20m_rental: cleanNumeric(row['PFK 20m - Rental'] || row['PFK 20m - Rental:']),
      roller_door_switches_rental: cleanNumeric(row['Roller Door Switches - Rental'] || row['Roller Door Switches - Rental:']),
      consultancy: cleanNumeric(row['Consultancy'] || row['Consultancy: ']),
      roaming: cleanNumeric(row['Roaming'] || row['Roaming: ']),
      maintenance: cleanNumeric(row['Maintenance'] || row['Maintenance: ']),
      after_hours: cleanNumeric(row['After Hours'] || row['After Hours: ']),
      controlroom: cleanNumeric(row['Controlroom'] || row['Controlroom: ']),
      total_rental_sub: cleanNumeric(row['Total Rental & Sub'] || row['Total Rental & Sub:']),
      total_rental: cleanNumeric(row['Total Rental'] || row['Total Rental: ']),
      total_sub: cleanNumeric(row['Total Sub'] || row['Total Sub: '])
    }));

    const batchSize = 100;
    let skipped = 0;
    for (let i = 0; i < vehicles.length; i += batchSize) {
      const batch = vehicles.slice(i, i + batchSize);
      
      for (const vehicle of batch) {
        if (!vehicle.reg) {
          console.log('⚠️  Skipping vehicle without reg');
          skipped++;
          continue;
        }
        
        const { data: existing } = await supabase
          .from('vehicles_duplicate')
          .select('id')
          .eq('reg', vehicle.reg)
          .single();
        
        if (existing) {
          console.log(`⏭️  Skipping ${vehicle.reg} - already exists`);
          skipped++;
        } else {
          const { error } = await supabase
            .from('vehicles_duplicate')
            .insert(vehicle);
          
          if (error) {
            console.error(`❌ Error inserting ${vehicle.reg}:`, error.message);
            totalFailed++;
          } else {
            console.log(`✓ Inserted ${vehicle.reg}`);
            totalInserted++;
          }
        }
      }
      
      console.log(`Batch ${i / batchSize + 1} - Inserted: ${totalInserted}, Skipped: ${skipped}, Failed: ${totalFailed}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total failed: ${totalFailed}`);
}

insertVehicles().catch(console.error);
