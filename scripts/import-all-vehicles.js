const XLSX = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Read Excel file
const workbook = XLSX.readFile('c:\\Users\\mabuk\\Desktop\\Systems\\Solflo\\motion-live\\components\\accounts\\NEW - Consolidated Solflo Template (3).xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

// Read companies JSON
const companies = JSON.parse(fs.readFileSync('c:\\Users\\mabuk\\Desktop\\Systems\\Solflo\\motion-live\\scripts\\companies.json', 'utf8'));

// Create company lookup map
const companyMap = new Map();
companies.forEach(c => {
  companyMap.set(c.company.toLowerCase().trim(), c.cost_code);
});

console.log(`Total records to insert: ${data.length}\n`);

// Map Excel columns to database columns
const mapRowToDbRecord = (row) => {
  const companyName = (row['Company Name: '] || '').toString().trim();
  const costCode = companyMap.get(companyName.toLowerCase());
  
  return {
    company: companyName || null,
    new_account_number: costCode || null,
    branch: row['Branch: '] || null,
    fleet_number: row['Fleet number: '] || null,
    reg: row['Reg: '] || null,
    make: row['Make: '] || null,
    model: row['Model: '] || null,
    vin: row['VIN: '] || null,
    engine: row['Engine: '] || null,
    year: row['Year: '] || null,
    colour: row['Colour: '] || null,
    skylink_trailer_unit_serial_number: row['Skylink Trailer Unit - Serial number:'] || null,
    skylink_trailer_unit_ip: row['Skylink Trailer Unit - IP: '] || null,
    sky_on_batt_ign_unit_serial_number: row['Sky On Batt Ign Unit - Serial number:'] || null,
    sky_on_batt_ign_unit_ip: row['Sky On Batt Ign Unit - IP: '] || null,
    skylink_voice_kit_serial_number: row['Skylink Voice Kit - Serial number:'] || null,
    skylink_voice_kit_ip: row['Skylink Voice Kit - IP: '] || null,
    sky_scout_12v_serial_number: row['Sky Scout 12V - Serial number:'] || null,
    sky_scout_12v_ip: row['Sky Scout 12V - IP: '] || null,
    sky_scout_24v_serial_number: row['Sky Scout 24V - Serial number:'] || null,
    sky_scout_24v_ip: row['Sky Scout 24V - IP: '] || null,
    skylink_pro_serial_number: row['Skylink Pro - Serial number:'] || null,
    skylink_pro_ip: row['Skylink Pro - IP: '] || null,
    skylink_sim_card_no: row['Skylink sim card no: '] || null,
    skylink_data_number: row['Skylink data number: '] || null,
    sky_safety: row['Sky Safety: '] || null,
    sky_idata: row['Sky iData: '] || null,
    sky_ican: row['Sky iCan: '] || null,
    industrial_panic: row['Industrial Panic: '] || null,
    flat_panic: row['Flat Panic: '] || null,
    buzzer: row['Buzzer: '] || null,
    tag: row['Tag: '] || null,
    tag_reader: row['Tag Reader: '] || null,
    keypad: row['Keypad: '] || null,
    keypad_waterproof: row['Keypad Waterproof: '] || null,
    early_warning: row['Early Warning: '] || null,
    cia: row['CIA: '] || null,
    fm_unit: row['FM Unit: '] || null,
    sim_card_number: row['Sim Card Number: '] || null,
    data_number: row['Data Number: '] || null,
    gps: row['GPS: '] || null,
    gsm: row['GSM: '] || null,
    tag_: row['Tag : '] || null,
    tag_reader_: row['Tag Reader : '] || null,
    main_fm_harness: row['Main FM Harness: '] || null,
    beame_1: row['Beame 1: '] || null,
    beame_2: row['Beame 2: '] || null,
    beame_3: row['Beame 3: '] || null,
    beame_4: row['Beame 4: '] || null,
    beame_5: row['Beame 5: '] || null,
    fuel_probe_1: row['Fuel Probe 1: '] || null,
    fuel_probe_2: row['Fuel Probe 2: '] || null,
    _7m_harness_for_probe: row['7m Harness for Probe: '] || null,
    tpiece: row['Tpiece: '] || null,
    idata: row['iData: '] || null,
    _1m_extension_cable: row['1m Extension Cable: '] || null,
    _3m_extension_cable: row['3m Extension Cable: '] || null,
    _4ch_mdvr: row['4ch MDVR: '] || null,
    _5ch_mdvr: row['5ch MDVR: '] || null,
    _8ch_mdvr: row['8ch MDVR: '] || null,
    a2_dash_cam: row['A2 Dash Cam: '] || null,
    a3_dash_cam_ai: row['A3 Dash Cam AI: '] || null,
    corpconnect_sim_no: row['CorpConnect Sim No: '] || null,
    corpconnect_data_no: row['CorpConnect Data No: '] || null,
    sim_id: row['Sim ID: '] || null,
    _5m_cable_for_camera_4pin: row['5m Cable for Camera 4pin: '] || null,
    _5m_cable_6pin: row['5m Cable 6pin: '] || null,
    _10m_cable_for_camera_4pin: row['10m Cable for Camera 4pin: '] || null,
    a2_mec_5: row['A2 MEC 5: '] || null,
    vw400_dome_1: row['VW400 Dome 1: '] || null,
    vw400_dome_2: row['VW400 Dome 2: '] || null,
    vw300_dakkie_dome_1: row['VW300 Dakkie Dome 1: '] || null,
    vw300_dakkie_dome_2: row['VW300 Dakkie Dome 2: '] || null,
    vw502_dual_lens_camera: row['VW502 Dual Lens Camera: '] || null,
    vw303_driver_facing_camera: row['VW303 Driver Facing Camera: '] || null,
    vw502f_road_facing_camera: row['VW502F Road Facing Camera: '] || null,
    vw306_dvr_road_facing_for_4ch_8ch: row['VW306 DVR Road Facing for 4ch & 8ch: '] || null,
    vw306m_a2_dash_cam: row['VW306M A2 Dash Cam: '] || null,
    dms01_driver_facing: row['DMS01 Driver Facing: '] || null,
    adas_02_road_facing: row['ADAS 02 Road Facing: '] || null,
    vw100ip_driver_facing_ip: row['VW100IP Driver Facing IP: '] || null,
    sd_card_1tb: row['SD Card 1TB: '] || null,
    sd_card_2tb: row['SD Card 2TB: '] || null,
    sd_card_480gb: row['SD Card 480GB: '] || null,
    sd_card_256gb: row['SD Card 256GB: '] || null,
    sd_card_512gb: row['SD Card 512GB: '] || null,
    sd_card_250gb: row['SD Card 250GB: '] || null,
    mic: row['Mic: '] || null,
    speaker: row['Speaker: '] || null,
    pfk_main_unit: row['PFK Main Unit: '] || null,
    pfk_corpconnect_sim_number: row['PFK CorpConnect Sim Number: '] || null,
    pfk_corpconnect_data_number: row['PFK CorpConnect Data Number: '] || null,
    breathaloc: row['Breathaloc: '] || null,
    pfk_road_facing: row['PFK Road Facing: '] || null,
    pfk_driver_facing: row['PFK Driver Facing: '] || null,
    pfk_dome_1: row['PFK Dome 1: '] || null,
    pfk_dome_2: row['PFK Dome 2: '] || null,
    pfk_5m: row['PFK 5m: '] || null,
    pfk_10m: row['PFK 10m: '] || null,
    pfk_15m: row['PFK 15m: '] || null,
    pfk_20m: row['PFK 20m: '] || null,
    roller_door_switches: row['Roller Door Switches: '] || null,
    account_number: row['Account Number: '] || null,
    skylink_trailer_unit_rental: row['Skylink Trailer Unit - Rental:'] || null,
    skylink_trailer_sub: row['Skylink Trailer - Sub: '] || null,
    sky_on_batt_ign_rental: row['Sky On Batt Ign - Rental:'] || null,
    sky_on_batt_sub: row['Sky On Batt - Sub: '] || null,
    skylink_voice_kit_rental: row['Skylink Voice Kit - Rental:'] || null,
    skylink_voice_kit_sub: row['Skylink Voice Kit - Sub: '] || null,
    sky_scout_12v_rental: row['Sky Scout 12V - Rental:'] || null,
    sky_scout_12v_sub: row['Sky Scout 12V - Sub: '] || null,
    sky_scout_24v_rental: row['Sky Scout 24V - Rental:'] || null,
    sky_scout_24v_sub: row['Sky Scout 24V - Sub: '] || null,
    skylink_pro_rental: row['Skylink Pro - Rental:'] || null,
    skylink_pro_sub: row['Skylink Pro - Sub: '] || null,
    sky_idata_rental: row['Sky iData - Rental:'] || null,
    sky_ican_rental: row['Sky iCan - Rental:'] || null,
    industrial_panic_rental: row['Industrial Panic - Rental:'] || null,
    flat_panic_rental: row['Flat Panic - Rental:'] || null,
    buzzer_rental: row['Buzzer - Rental:'] || null,
    tag_rental: row['Tag - Rental:'] || null,
    tag_reader_rental: row['Tag Reader - Rental:'] || null,
    keypad_rental: row['Keypad - Rental:'] || null,
    early_warning_rental: row['Early Warning - Rental:'] || null,
    cia_rental: row['CIA - Rental:'] || null,
    fm_unit_rental: row['FM Unit - Rental:'] || null,
    fm_unit_sub: row['FM Unit - Sub: '] || null,
    gps_rental: row['GPS - Rental:'] || null,
    gsm_rental: row['GSM - Rental:'] || null,
    main_fm_harness_rental: row['Main FM Harness - Rental:'] || null,
    beame_1_rental: row['Beame 1 - Rental:'] || null,
    beame_1_sub: row['Beame 1 - Sub: '] || null,
    beame_2_rental: row['Beame 2 - Rental:'] || null,
    beame_2_sub: row['Beame 2 - Sub: '] || null,
    beame_3_rental: row['Beame 3 - Rental:'] || null,
    beame_3_sub: row['Beame 3 - Sub: '] || null,
    beame_4_rental: row['Beame 4 - Rental:'] || null,
    beame_4_sub: row['Beame 4 - Sub: '] || null,
    beame_5_rental: row['Beame 5 - Rental:'] || null,
    beame_5_sub: row['Beame 5 - Sub: '] || null,
    single_probe_rental: row['Single Probe - Rental:'] || null,
    single_probe_sub: row['Single Probe - Sub: '] || null,
    dual_probe_rental: row['Dual Probe - Rental:'] || null,
    dual_probe_sub: row['Dual Probe - Sub: '] || null,
    _7m_harness_for_probe_rental: row['7m Harness for Probe - Rental:'] || null,
    tpiece_rental: row['Tpiece - Rental:'] || null,
    idata_rental: row['iData - Rental:'] || null,
    _1m_extension_cable_rental: row['1m Extension Cable - Rental:'] || null,
    _3m_extension_cable_rental: row['3m Extension Cable - Rental:'] || null,
    _4ch_mdvr_rental: row['4ch MDVR - Rental:'] || null,
    _4ch_mdvr_sub: row['4ch MDVR - Sub: '] || null,
    _5ch_mdvr_rental: row['5ch MDVR - Rental:'] || null,
    _5ch_mdvr_sub: row['5ch MDVR - Sub: '] || null,
    _8ch_mdvr_rental: row['8ch MDVR - Rental:'] || null,
    _8ch_mdvr_sub: row['8ch MDVR - Sub: '] || null,
    a2_dash_cam_rental: row['A2 Dash Cam - Rental:'] || null,
    a2_dash_cam_sub: row['A2 Dash Cam - Sub: '] || null,
    a3_dash_cam_ai_rental: row['A3 Dash Cam AI - Rental:'] || null,
    _5m_cable_for_camera_4pin_rental: row['5m Cable for Camera 4pin - Rental:'] || null,
    _5m_cable_6pin_rental: row['5m Cable 6pin - Rental:'] || null,
    _10m_cable_for_camera_4pin_rental: row['10m Cable for Camera 4pin - Rental:'] || null,
    a2_mec_5_rental: row['A2 MEC 5 - Rental:'] || null,
    vw400_dome_1_rental: row['VW400 Dome 1 - Rental:'] || null,
    vw400_dome_2_rental: row['VW400 Dome 2 - Rental:'] || null,
    vw300_dakkie_dome_1_rental: row['VW300 Dakkie Dome 1 - Rental:'] || null,
    vw300_dakkie_dome_2_rental: row['VW300 Dakkie Dome 2 - Rental:'] || null,
    vw502_dual_lens_camera_rental: row['VW502 Dual Lens Camera - Rental:'] || null,
    vw303_driver_facing_camera_rental: row['VW303 Driver Facing Camera - Rental:'] || null,
    vw502f_road_facing_camera_rental: row['VW502F Road Facing Camera - Rental:'] || null,
    vw306_dvr_road_facing_for_4ch_8ch_rental: row['VW306 DVR Road Facing for 4ch & 8ch - Rental:'] || null,
    vw306m_a2_dash_cam_rental: row['VW306M A2 Dash Cam - Rental:'] || null,
    dms01_driver_facing_rental: row['DMS01 Driver Facing - Rental:'] || null,
    adas_02_road_facing_rental: row['ADAS 02 Road Facing - Rental:'] || null,
    vw100ip_driver_facing_rental: row['VW100IP Driver Facing - Rental:'] || null,
    sd_card_1tb_rental: row['SD Card 1TB - Rental:'] || null,
    sd_card_2tb_rental: row['SD Card 2TB - Rental:'] || null,
    sd_card_480gb_rental: row['SD Card 480GB - Rental:'] || null,
    sd_card_256gb_rental: row['SD Card 256GB - Rental:'] || null,
    sd_card_512gb_rental: row['SD Card 512GB - Rental:'] || null,
    sd_card_250gb_rental: row['SD Card 250GB - Rental:'] || null,
    mic_rental: row['Mic - Rental:'] || null,
    speaker_rental: row['Speaker - Rental:'] || null,
    pfk_main_unit_rental: row['PFK Main Unit - Rental:'] || null,
    pfk_main_unit_sub: row['PFK Main Unit - Sub: '] || null,
    breathaloc_rental: row['Breathaloc - Rental:'] || null,
    pfk_road_facing_rental: row['PFK Road Facing - Rental:'] || null,
    pfk_driver_facing_rental: row['PFK Driver Facing - Rental:'] || null,
    pfk_dome_1_rental: row['PFK Dome 1 - Rental:'] || null,
    pfk_dome_2_rental: row['PFK Dome 2 - Rental:'] || null,
    pfk_5m_rental: row['PFK 5m - Rental:'] || null,
    pfk_10m_rental: row['PFK 10m - Rental:'] || null,
    pfk_15m_rental: row['PFK 15m - Rental:'] || null,
    pfk_20m_rental: row['PFK 20m - Rental:'] || null,
    roller_door_switches_rental: row['Roller Door Switches - Rental:'] || null,
    consultancy: row['Consultancy: '] || null,
    roaming: row['Roaming: '] || null,
    maintenance: row['Maintenance: '] || null,
    after_hours: row['After Hours: '] || null,
    controlroom: row['Controlroom: '] || null,
    total_rental_sub: row['Total Sub: '] || null,
    total_rental: row['Total Rental: '] || null,
    total_sub: row['Total Sub: '] || null
  };
};

// Process all records
const records = data.map(mapRowToDbRecord);

// Insert in batches
async function insertAllRecords() {
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    try {
      const { data: result, error } = await supabase
        .from('vehicles_duplicate')
        .insert(batch);
      
      if (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
        errors += batch.length;
      } else {
        inserted += batch.length;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records (Total: ${inserted}/${records.length})`);
      }
    } catch (err) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} exception:`, err.message);
      errors += batch.length;
    }
  }
  
  console.log(`\n=== INSERTION COMPLETE ===`);
  console.log(`Total records: ${records.length}`);
  console.log(`Successfully inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  
  // Show matching stats
  const withCostCode = records.filter(r => r.new_account_number).length;
  console.log(`\nRecords with cost_code: ${withCostCode}`);
  console.log(`Records without cost_code: ${records.length - withCostCode}`);
}

// Run the insertion
insertAllRecords().catch(console.error);
