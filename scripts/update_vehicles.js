require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const columnMapping = {
  'Company Name:': 'company', 'New Account Number': 'new_account_number', 'Branch': 'branch',
  'Fleet number:': 'fleet_number', 'Reg:': 'reg', 'Make:': 'make', 'Model:': 'model',
  'VIN:': 'vin', 'Engine:': 'engine', 'Year:': 'year', 'Colour:': 'colour',
  'Skylink - Trailer Unit Serial number:': 'skylink_trailer_unit_serial_number',
  'Skylink - Trailer Unit IP:': 'skylink_trailer_unit_ip',
  'Sky On Batt Ign - Unit Serial number:': 'sky_on_batt_ign_unit_serial_number',
  'Sky On Batt Ign - Unit IP:': 'sky_on_batt_ign_unit_ip',
  'Skylink Voice Kit - Serial number:': 'skylink_voice_kit_serial_number',
  'Skylink Voice Kit - IP:': 'skylink_voice_kit_ip',
  'Sky Scout 12V - Serial number:': 'sky_scout_12v_serial_number',
  'Sky Scout 12V - IP:': 'sky_scout_12v_ip',
  'Sky Scout 24V - Serial number:': 'sky_scout_24v_serial_number',
  'Sky Scout 24V - IP:': 'sky_scout_24v_ip',
  'Skylink Pro - Serial number:': 'skylink_pro_serial_number',
  'Skylink Pro - IP:': 'skylink_pro_ip',
  'Skylink sim card no:': 'skylink_sim_card_no',
  'Skylink data number:': 'skylink_data_number',
  'Sky Safety': 'sky_safety', 'Sky iData': 'sky_idata', 'Sky iCan': 'sky_ican',
  'Industrial Panic': 'industrial_panic', 'Flat Panic': 'flat_panic',
  'Buzzer': 'buzzer', 'Tag': 'tag', 'Tag Reader': 'tag_reader',
  'Keypad': 'keypad', 'Keypad Waterproof': 'keypad_waterproof',
  'Early Warning': 'early_warning', 'CIA': 'cia', 'FM Unit': 'fm_unit',
  'Sim Card Number': 'sim_card_number', 'Data Number': 'data_number',
  'GPS': 'gps', 'GSM': 'gsm', 'Tag ': 'tag_', 'Tag Reader ': 'tag_reader_',
  'Main FM Harness': 'main_fm_harness', 'Beame 1': 'beame_1', 'Beame 2': 'beame_2',
  'Beame 3': 'beame_3', 'Beame 4': 'beame_4', 'Beame 5': 'beame_5',
  'Fuel Probe 1': 'fuel_probe_1', 'Fuel Probe 2': 'fuel_probe_2',
  '7m Harness for Probe': '_7m_harness_for_probe', 'Tpiece': 'tpiece',
  'iData': 'idata', '1m Extension Cable': '_1m_extension_cable',
  '3m Extension Cable': '_3m_extension_cable', '4ch MDVR': '_4ch_mdvr',
  '5ch MDVR': '_5ch_mdvr', '8ch MDVR': '_8ch_mdvr', 'A2 Dash Cam': 'a2_dash_cam',
  'A3 Dash Cam AI': 'a3_dash_cam_ai', 'CorpConnect Sim No': 'corpconnect_sim_no',
  'CorpConnect Data No': 'corpconnect_data_no', 'Sim ID': 'sim_id',
  '5m Cable for Camera 4pin': '_5m_cable_for_camera_4pin',
  '5m Cable 6pin': '_5m_cable_6pin', '10m Cable for Camera 4pin': '_10m_cable_for_camera_4pin',
  'A2 MEC 5': 'a2_mec_5', 'VW400 Dome 1': 'vw400_dome_1', 'VW400 Dome 2': 'vw400_dome_2',
  'VW300 Dakkie Dome 1': 'vw300_dakkie_dome_1', 'VW300 Dakkie Dome 2': 'vw300_dakkie_dome_2',
  'VW502 Dual Lens Camera': 'vw502_dual_lens_camera',
  'VW303 Driver Facing Camera': 'vw303_driver_facing_camera',
  'VW502F Road Facing Camera': 'vw502f_road_facing_camera',
  'VW306 DVR Road Facing for 4ch/8ch': 'vw306_dvr_road_facing_for_4ch_8ch',
  'VW306M A2 Dash Cam': 'vw306m_a2_dash_cam', 'DMS01 Driver Facing': 'dms01_driver_facing',
  'ADAS 02 Road Facing': 'adas_02_road_facing', 'VW100IP Driver Facing IP': 'vw100ip_driver_facing_ip',
  'SD Card 1TB': 'sd_card_1tb', 'SD Card 2TB': 'sd_card_2tb',
  'SD Card 480GB': 'sd_card_480gb', 'SD Card 256GB': 'sd_card_256gb',
  'SD Card 512GB': 'sd_card_512gb', 'SD Card 250GB': 'sd_card_250gb',
  'Mic': 'mic', 'Speaker': 'speaker', 'PFK Main Unit': 'pfk_main_unit',
  'PFK CorpConnect Sim Number': 'pfk_corpconnect_sim_number',
  'PFK CorpConnect Data Number': 'pfk_corpconnect_data_number',
  'Breathaloc': 'breathaloc', 'PFK Road Facing': 'pfk_road_facing',
  'PFK Driver Facing': 'pfk_driver_facing', 'PFK Dome 1': 'pfk_dome_1',
  'PFK Dome 2': 'pfk_dome_2', 'PFK 5m': 'pfk_5m', 'PFK 10m': 'pfk_10m',
  'PFK 15m': 'pfk_15m', 'PFK 20m': 'pfk_20m', 'Roller Door Switches': 'roller_door_switches',
  'Account Number': 'account_number', 'Skylink - Trailer Unit Rental:': 'skylink_trailer_unit_rental',
  'Skylink - Trailer Sub:': 'skylink_trailer_sub', 'Sky On Batt Ign - Rental:': 'sky_on_batt_ign_rental',
  'Sky On Batt - Sub:': 'sky_on_batt_sub', 'Skylink Voice Kit - Rental:': 'skylink_voice_kit_rental',
  'Skylink Voice Kit - Sub:': 'skylink_voice_kit_sub', 'Sky Scout 12V - Rental:': 'sky_scout_12v_rental',
  'Sky Scout 12V - Sub:': 'sky_scout_12v_sub', 'Sky Scout 24V - Rental:': 'sky_scout_24v_rental',
  'Sky Scout 24V - Sub:': 'sky_scout_24v_sub', 'Skylink Pro - Rental:': 'skylink_pro_rental',
  'Skylink Pro - Sub:': 'skylink_pro_sub', 'Sky iData - Rental:': 'sky_idata_rental',
  'Sky iCan - Rental:': 'sky_ican_rental', 'Industrial Panic - Rental:': 'industrial_panic_rental',
  'Flat Panic - Rental:': 'flat_panic_rental', 'Buzzer - Rental:': 'buzzer_rental',
  'Tag - Rental:': 'tag_rental', 'Tag Reader - Rental:': 'tag_reader_rental',
  'Keypad - Rental:': 'keypad_rental', 'Early Warning - Rental:': 'early_warning_rental',
  'CIA - Rental:': 'cia_rental', 'FM Unit - Rental:': 'fm_unit_rental',
  'FM Unit - Sub:': 'fm_unit_sub', 'GPS - Rental:': 'gps_rental', 'GSM - Rental:': 'gsm_rental',
  'Tag - Rental ': 'tag_rental', 'Tag Reader - Rental ': 'tag_reader_rental',
  'Main FM Harness - Rental:': 'main_fm_harness_rental', 'Beame 1 - Rental:': 'beame_1_rental',
  'Beame 1 - Sub:': 'beame_1_sub', 'Beame 2 - Rental:': 'beame_2_rental',
  'Beame 2 - Sub:': 'beame_2_sub', 'Beame 3 - Rental:': 'beame_3_rental',
  'Beame 3 - Sub:': 'beame_3_sub', 'Beame 4 - Rental:': 'beame_4_rental',
  'Beame 4 - Sub:': 'beame_4_sub', 'Beame 5 - Rental:': 'beame_5_rental',
  'Beame 5 - Sub:': 'beame_5_sub', 'Single Probe - Rental:': 'single_probe_rental',
  'Single Probe - Sub:': 'single_probe_sub', 'Dual Probe - Rental:': 'dual_probe_rental',
  'Dual Probe - Sub:': 'dual_probe_sub', '7m Harness for Probe - Rental:': '_7m_harness_for_probe_rental',
  'Tpiece - Rental:': 'tpiece_rental', 'iData - Rental:': 'idata_rental',
  '1m Extension Cable - Rental:': '_1m_extension_cable_rental',
  '3m Extension Cable - Rental:': '_3m_extension_cable_rental',
  '4ch MDVR - Rental:': '_4ch_mdvr_rental', '4ch MDVR - Sub:': '_4ch_mdvr_sub',
  '5ch MDVR - Rental:': '_5ch_mdvr_rental', '5ch MDVR - Sub:': '_5ch_mdvr_sub',
  '8ch MDVR - Rental:': '_8ch_mdvr_rental', '8ch MDVR - Sub:': '_8ch_mdvr_sub',
  'A2 Dash Cam - Rental:': 'a2_dash_cam_rental', 'A2 Dash Cam - Sub:': 'a2_dash_cam_sub',
  'A3 Dash Cam AI - Rental:': 'a3_dash_cam_ai_rental',
  '5m Cable for Camera 4pin - Rental:': '_5m_cable_for_camera_4pin_rental',
  '5m Cable 6pin - Rental:': '_5m_cable_6pin_rental',
  '10m Cable for Camera 4pin - Rental:': '_10m_cable_for_camera_4pin_rental',
  'A2 MEC 5 - Rental:': 'a2_mec_5_rental', 'VW400 Dome 1 - Rental:': 'vw400_dome_1_rental',
  'VW400 Dome 2 - Rental:': 'vw400_dome_2_rental',
  'VW300 Dakkie Dome 1 - Rental:': 'vw300_dakkie_dome_1_rental',
  'VW300 Dakkie Dome 2 - Rental:': 'vw300_dakkie_dome_2_rental',
  'VW502 Dual Lens Camera - Rental:': 'vw502_dual_lens_camera_rental',
  'VW303 Driver Facing Camera - Rental:': 'vw303_driver_facing_camera_rental',
  'VW502F Road Facing Camera - Rental:': 'vw502f_road_facing_camera_rental',
  'VW306 DVR Road Facing for 4ch/8ch - Rental:': 'vw306_dvr_road_facing_for_4ch_8ch_rental',
  'VW306M A2 Dash Cam - Rental:': 'vw306m_a2_dash_cam_rental',
  'DMS01 Driver Facing - Rental:': 'dms01_driver_facing_rental',
  'ADAS 02 Road Facing - Rental:': 'adas_02_road_facing_rental',
  'VW100IP Driver Facing - Rental:': 'vw100ip_driver_facing_rental',
  'SD Card 1TB - Rental:': 'sd_card_1tb_rental', 'SD Card 2TB - Rental:': 'sd_card_2tb_rental',
  'SD Card 480GB - Rental:': 'sd_card_480gb_rental', 'SD Card 256GB - Rental:': 'sd_card_256gb_rental',
  'SD Card 512GB - Rental:': 'sd_card_512gb_rental', 'SD Card 250GB - Rental:': 'sd_card_250gb_rental',
  'Mic - Rental:': 'mic_rental', 'Speaker - Rental:': 'speaker_rental',
  'PFK Main Unit - Rental:': 'pfk_main_unit_rental', 'PFK Main Unit - Sub:': 'pfk_main_unit_sub',
  'Breathaloc - Rental:': 'breathaloc_rental', 'PFK Road Facing - Rental:': 'pfk_road_facing_rental',
  'PFK Driver Facing - Rental:': 'pfk_driver_facing_rental',
  'PFK Dome 1 - Rental:': 'pfk_dome_1_rental', 'PFK Dome 2 - Rental:': 'pfk_dome_2_rental',
  'PFK 5m - Rental:': 'pfk_5m_rental', 'PFK 10m - Rental:': 'pfk_10m_rental',
  'PFK 15m - Rental:': 'pfk_15m_rental', 'PFK 20m - Rental:': 'pfk_20m_rental',
  'Roller Door Switches - Rental:': 'roller_door_switches_rental',
  'Consultancy': 'consultancy', 'Roaming': 'roaming', 'Maintenance': 'maintenance',
  'After Hours': 'after_hours', 'Controlroom': 'controlroom'
};rpConnect Sim Number': 'pfk_corpconnect_sim_number',
  'PFK CorpConnect Data Number': 'pfk_corpconnect_data_number',
  'Breathaloc': 'breathaloc', 'PFK Road Facing': 'pfk_road_facing',
  'PFK Driver Facing': 'pfk_driver_facing', 'PFK Dome 1': 'pfk_dome_1',
  'PFK Dome 2': 'pfk_dome_2', 'PFK 5m': 'pfk_5m', 'PFK 10m': 'pfk_10m',
  'PFK 15m': 'pfk_15m', 'PFK 20m': 'pfk_20m', 'Roller Door Switches': 'roller_door_switches',
  'Account Number': 'account_number', 'Skylink Trailer Unit Rental': 'skylink_trailer_unit_rental',
  'Skylink Trailer Sub': 'skylink_trailer_sub', 'Sky On Batt Ign Rental': 'sky_on_batt_ign_rental',
  'Sky On Batt Sub': 'sky_on_batt_sub', 'Skylink Voice Kit Rental': 'skylink_voice_kit_rental',
  'Skylink Voice Kit Sub': 'skylink_voice_kit_sub', 'Sky Scout 12V Rental': 'sky_scout_12v_rental',
  'Sky Scout 12V Sub': 'sky_scout_12v_sub', 'Sky Scout 24V Rental': 'sky_scout_24v_rental',
  'Sky Scout 24V Sub': 'sky_scout_24v_sub', 'Skylink Pro Rental': 'skylink_pro_rental',
  'Skylink Pro Sub': 'skylink_pro_sub', 'Sky iData Rental': 'sky_idata_rental',
  'Sky iCan Rental': 'sky_ican_rental', 'Industrial Panic Rental': 'industrial_panic_rental',
  'Flat Panic Rental': 'flat_panic_rental', 'Buzzer Rental': 'buzzer_rental',
  'Tag Rental': 'tag_rental', 'Tag Reader Rental': 'tag_reader_rental',
  'Keypad Rental': 'keypad_rental', 'Early Warning Rental': 'early_warning_rental',
  'CIA Rental': 'cia_rental', 'FM Unit Rental': 'fm_unit_rental',
  'FM Unit Sub': 'fm_unit_sub', 'GPS Rental': 'gps_rental', 'GSM Rental': 'gsm_rental',
  'Tag Rental ': 'tag_rental', 'Tag Reader Rental ': 'tag_reader_rental',
  'Main FM Harness Rental': 'main_fm_harness_rental', 'Beame 1 Rental': 'beame_1_rental',
  'Beame 1 Sub': 'beame_1_sub', 'Beame 2 Rental': 'beame_2_rental',
  'Beame 2 Sub': 'beame_2_sub', 'Beame 3 Rental': 'beame_3_rental',
  'Beame 3 Sub': 'beame_3_sub', 'Beame 4 Rental': 'beame_4_rental',
  'Beame 4 Sub': 'beame_4_sub', 'Beame 5 Rental': 'beame_5_rental',
  'Beame 5 Sub': 'beame_5_sub', 'Single Probe Rental': 'single_probe_rental',
  'Single Probe Sub': 'single_probe_sub', 'Dual Probe Rental': 'dual_probe_rental',
  'Dual Probe Sub': 'dual_probe_sub', '7m Harness for Probe Rental': '_7m_harness_for_probe_rental',
  'Tpiece Rental': 'tpiece_rental', 'iData Rental': 'idata_rental',
  '1m Extension Cable Rental': '_1m_extension_cable_rental',
  '3m Extension Cable Rental': '_3m_extension_cable_rental',
  '4ch MDVR Rental': '_4ch_mdvr_rental', '4ch MDVR Sub': '_4ch_mdvr_sub',
  '5ch MDVR Rental': '_5ch_mdvr_rental', '5ch MDVR Sub': '_5ch_mdvr_sub',
  '8ch MDVR Rental': '_8ch_mdvr_rental', '8ch MDVR Sub': '_8ch_mdvr_sub',
  'A2 Dash Cam Rental': 'a2_dash_cam_rental', 'A2 Dash Cam Sub': 'a2_dash_cam_sub',
  'A3 Dash Cam AI Rental': 'a3_dash_cam_ai_rental',
  '5m Cable for Camera 4pin Rental': '_5m_cable_for_camera_4pin_rental',
  '5m Cable 6pin Rental': '_5m_cable_6pin_rental',
  '10m Cable for Camera 4pin Rental': '_10m_cable_for_camera_4pin_rental',
  'A2 MEC 5 Rental': 'a2_mec_5_rental', 'VW400 Dome 1 Rental': 'vw400_dome_1_rental',
  'VW400 Dome 2 Rental': 'vw400_dome_2_rental',
  'VW300 Dakkie Dome 1 Rental': 'vw300_dakkie_dome_1_rental',
  'VW300 Dakkie Dome 2 Rental': 'vw300_dakkie_dome_2_rental',
  'VW502 Dual Lens Camera Rental': 'vw502_dual_lens_camera_rental',
  'VW303 Driver Facing Camera Rental': 'vw303_driver_facing_camera_rental',
  'VW502F Road Facing Camera Rental': 'vw502f_road_facing_camera_rental',
  'VW306 DVR Road Facing for 4ch/8ch Rental': 'vw306_dvr_road_facing_for_4ch_8ch_rental',
  'VW306M A2 Dash Cam Rental': 'vw306m_a2_dash_cam_rental',
  'DMS01 Driver Facing Rental': 'dms01_driver_facing_rental',
  'ADAS 02 Road Facing Rental': 'adas_02_road_facing_rental',
  'VW100IP Driver Facing Rental': 'vw100ip_driver_facing_rental',
  'SD Card 1TB Rental': 'sd_card_1tb_rental', 'SD Card 2TB Rental': 'sd_card_2tb_rental',
  'SD Card 480GB Rental': 'sd_card_480gb_rental', 'SD Card 256GB Rental': 'sd_card_256gb_rental',
  'SD Card 512GB Rental': 'sd_card_512gb_rental', 'SD Card 250GB Rental': 'sd_card_250gb_rental',
  'Mic Rental': 'mic_rental', 'Speaker Rental': 'speaker_rental',
  'PFK Main Unit Rental': 'pfk_main_unit_rental', 'PFK Main Unit Sub': 'pfk_main_unit_sub',
  'Breathaloc Rental': 'breathaloc_rental', 'PFK Road Facing Rental': 'pfk_road_facing_rental',
  'PFK Driver Facing Rental': 'pfk_driver_facing_rental',
  'PFK Dome 1 Rental': 'pfk_dome_1_rental', 'PFK Dome 2 Rental': 'pfk_dome_2_rental',
  'PFK 5m Rental': 'pfk_5m_rental', 'PFK 10m Rental': 'pfk_10m_rental',
  'PFK 15m Rental': 'pfk_15m_rental', 'PFK 20m Rental': 'pfk_20m_rental',
  'Roller Door Switches Rental': 'roller_door_switches_rental',
  'Consultancy': 'consultancy', 'Roaming': 'roaming', 'Maintenance': 'maintenance',
  'After Hours': 'after_hours', 'Controlroom': 'controlroom'
};

const excludeColumns = ['total_rental_sub', 'total_rental', 'total_sub'];

async function updateVehicles() {
  console.log('🔄 UPDATING VEHICLES FROM EXCEL\n');
  console.log('='.repeat(80));
  
  // Read Excel
  const workbook = XLSX.readFile('scripts/NEW - Consolidated Solflo Template (3).xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const headerRowIndex = rawData.findIndex(row => 
    row && row.some(cell => cell && cell.toString().toLowerCase().includes('reg'))
  );
  
  if (headerRowIndex === -1) {
    console.error('❌ Could not find header row');
    return;
  }
  
  const headers = rawData[headerRowIndex].map(h => h ? h.toString().trim() : '');
  const dataRows = rawData.slice(headerRowIndex + 1);
  
  const excelData = dataRows
    .filter(row => row && row.length > 0)
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => { obj[header] = row[i]; });
      return obj;
    })
    .filter(row => row['Reg:'] || row['Fleet number:']);
  
  console.log(`📊 Found ${excelData.length} rows in Excel\n`);

  // Get all vehicles with pagination
  let allVehicles = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, reg, fleet_number')
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('❌ Error fetching vehicles:', error);
      return;
    }
    
    if (!vehicles || vehicles.length === 0) break;
    
    allVehicles = allVehicles.concat(vehicles);
    from += pageSize;
    console.log(`   Loaded ${allVehicles.length} vehicles...`);
    
    if (vehicles.length < pageSize) break;
  }
  
  console.log(`🗄️  Found ${allVehicles.length} vehicles in database\n`);
  
  const regMap = new Map(allVehicles.map(v => [v.reg?.toUpperCase().replace(/\s+/g, ''), v.id]));
  const fleetMap = new Map(allVehicles.map(v => [v.fleet_number?.toUpperCase().replace(/\s+/g, ''), v.id]));

  let updated = 0;
  let skipped = 0;
  const updates = [];
  const seenIds = new Set();
  
  for (const row of excelData) {
    const reg = (row['Reg:'] || '').toString().trim().toUpperCase().replace(/\s+/g, '');
    const fleet = (row['Fleet number:'] || '').toString().trim().toUpperCase().replace(/\s+/g, '');
    
    let vehicleId = reg ? regMap.get(reg) : null;
    if (!vehicleId && fleet) {
      vehicleId = fleetMap.get(fleet);
    }
    if (!vehicleId) {
      skipped++;
      continue;
    }

    // Skip duplicates
    if (seenIds.has(vehicleId)) continue;
    seenIds.add(vehicleId);

    const updateData = { id: vehicleId };
    for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
      if (excludeColumns.includes(dbCol)) continue;
      const value = row[excelCol];
      // Only update if value exists and is not empty
      if (value !== undefined && value !== null && value !== '') {
        updateData[dbCol] = value.toString();
      }
    }

    // Debug for FSI559
    if (fleet === 'FSI559') {
      console.log('\nDEBUG FSI559:');
      console.log('Excel row keys:', Object.keys(row));
      console.log('Update data:', updateData);
    }

    if (Object.keys(updateData).length > 1) {
      updates.push(updateData);
    }
  }

  console.log(`\n📊 Prepared ${updates.length} updates, processing in batches...\n`);

  // Bulk update in batches
  const batchSize = 500;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    const { error } = await supabase.from('vehicles').upsert(batch, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
    } else {
      updated += batch.length;
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}: Updated ${batch.length} vehicles (Total: ${updated}/${updates.length})`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ COMPLETE: Updated ${updated} vehicles, Skipped ${skipped}\n`);
}

updateVehicles().catch(console.error);
