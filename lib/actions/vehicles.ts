'use server';

import { createClient } from '@/lib/supabase/server';

export interface Vehicle {
  id: number;
  created_at: string;
  company: string | null;
  new_account_number: string | null;
  branch: string | null;
  unique_id: string | null;
  fleet_number: string | null;
  reg: string | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  engine: string | null;
  year: string | null;
  colour: string | null;
  skylink_trailer_unit_serial_number: string | null;
  skylink_trailer_unit_ip: string | null;
  sky_on_batt_ign_unit_serial_number: string | null;
  sky_on_batt_ign_unit_ip: string | null;
  skylink_voice_kit_serial_number: string | null;
  skylink_voice_kit_ip: string | null;
  sky_scout_12v_serial_number: string | null;
  sky_scout_12v_ip: string | null;
  sky_scout_24v_serial_number: string | null;
  sky_scout_24v_ip: string | null;
  skylink_pro_serial_number: string | null;
  skylink_pro_ip: string | null;
  skylink_sim_card_no: string | null;
  skylink_data_number: string | null;
  sky_safety: string | null;
  sky_idata: string | null;
  sky_ican: string | null;
  industrial_panic: string | null;
  flat_panic: string | null;
  buzzer: string | null;
  tag: string | null;
  tag_reader: string | null;
  keypad: string | null;
  keypad_waterproof: string | null;
  early_warning: string | null;
  cia: string | null;
  fm_unit: string | null;
  sim_card_number: string | null;
  data_number: string | null;
  gps: string | null;
  gsm: string | null;
  tag_: string | null;
  tag_reader_: string | null;
  main_fm_harness: string | null;
  beame_1: string | null;
  beame_2: string | null;
  beame_3: string | null;
  beame_4: string | null;
  beame_5: string | null;
  fuel_probe_1: string | null;
  fuel_probe_2: string | null;
  _7m_harness_for_probe: string | null;
  tpiece: string | null;
  idata: string | null;
  _1m_extension_cable: string | null;
  _3m_extension_cable: string | null;
  _4ch_mdvr: string | null;
  _5ch_mdvr: string | null;
  _8ch_mdvr: string | null;
  a2_dash_cam: string | null;
  a3_dash_cam_ai: string | null;
  corpconnect_sim_no: string | null;
  corpconnect_data_no: string | null;
  sim_id: string | null;
  _5m_cable_for_camera_4pin: string | null;
  _5m_cable_6pin: string | null;
  _10m_cable_for_camera_4pin: string | null;
  a2_mec_5: string | null;
  vw400_dome_1: string | null;
  vw400_dome_2: string | null;
  vw300_dakkie_dome_1: string | null;
  vw300_dakkie_dome_2: string | null;
  vw502_dual_lens_camera: string | null;
  vw303_driver_facing_camera: string | null;
  vw502f_road_facing_camera: string | null;
  vw306_dvr_road_facing_for_4ch_8ch: string | null;
  vw306m_a2_dash_cam: string | null;
  dms01_driver_facing: string | null;
  adas_02_road_facing: string | null;
  vw100ip_driver_facing_ip: string | null;
  sd_card_1tb: string | null;
  sd_card_2tb: string | null;
  sd_card_480gb: string | null;
  sd_card_256gb: string | null;
  sd_card_512gb: string | null;
  sd_card_250gb: string | null;
  mic: string | null;
  speaker: string | null;
  pfk_main_unit: string | null;
  pfk_corpconnect_sim_number: string | null;
  pfk_corpconnect_data_number: string | null;
  breathaloc: string | null;
  pfk_road_facing: string | null;
  pfk_driver_facing: string | null;
  pfk_dome_1: string | null;
  pfk_dome_2: string | null;
  pfk_5m: string | null;
  pfk_10m: string | null;
  pfk_15m: string | null;
  pfk_20m: string | null;
  roller_door_switches: string | null;
  account_number: string | null;
  skylink_trailer_unit_rental: string | null;
  skylink_trailer_sub: string | null;
  sky_on_batt_ign_rental: string | null;
  sky_on_batt_sub: string | null;
  skylink_voice_kit_rental: string | null;
  skylink_voice_kit_sub: string | null;
  sky_scout_12v_rental: string | null;
  sky_scout_12v_sub: string | null;
  sky_scout_24v_rental: string | null;
  sky_scout_24v_sub: string | null;
  skylink_pro_rental: string | null;
  skylink_pro_sub: string | null;
  sky_idata_rental: string | null;
  sky_ican_rental: string | null;
  industrial_panic_rental: string | null;
  flat_panic_rental: string | null;
  buzzer_rental: string | null;
  tag_rental: string | null;
  tag_reader_rental: string | null;
  keypad_rental: string | null;
  early_warning_rental: string | null;
  cia_rental: string | null;
  fm_unit_rental: string | null;
  fm_unit_sub: string | null;
  gps_rental: string | null;
  gsm_rental: string | null;
  tag_rental_: string | null;
  tag_reader_rental_: string | null;
  main_fm_harness_rental: string | null;
  beame_1_rental: string | null;
  beame_1_sub: string | null;
  beame_2_rental: string | null;
  beame_2_sub: string | null;
  beame_3_rental: string | null;
  beame_3_sub: string | null;
  beame_4_rental: string | null;
  beame_4_sub: string | null;
  beame_5_rental: string | null;
  beame_5_sub: string | null;
  single_probe_rental: string | null;
  single_probe_sub: string | null;
  dual_probe_rental: string | null;
  dual_probe_sub: string | null;
  _7m_harness_for_probe_rental: string | null;
  tpiece_rental: string | null;
  idata_rental: string | null;
  _1m_extension_cable_rental: string | null;
  _3m_extension_cable_rental: string | null;
  _4ch_mdvr_rental: string | null;
  _4ch_mdvr_sub: string | null;
  _5ch_mdvr_rental: string | null;
  _5ch_mdvr_sub: string | null;
  _8ch_mdvr_rental: string | null;
  _8ch_mdvr_sub: string | null;
  a2_dash_cam_rental: string | null;
  a2_dash_cam_sub: string | null;
  a3_dash_cam_ai_rental: string | null;
  _5m_cable_for_camera_4pin_rental: string | null;
  _5m_cable_6pin_rental: string | null;
  _10m_cable_for_camera_4pin_rental: string | null;
  a2_mec_5_rental: string | null;
  vw400_dome_1_rental: string | null;
  vw400_dome_2_rental: string | null;
  vw300_dakkie_dome_1_rental: string | null;
  vw300_dakkie_dome_2_rental: string | null;
  vw502_dual_lens_camera_rental: string | null;
  vw303_driver_facing_camera_rental: string | null;
  vw502f_road_facing_camera_rental: string | null;
  vw306_dvr_road_facing_for_4ch_8ch_rental: string | null;
  vw306m_a2_dash_cam_rental: string | null;
  dms01_driver_facing_rental: string | null;
  adas_02_road_facing_rental: string | null;
  vw100ip_driver_facing_rental: string | null;
  sd_card_1tb_rental: string | null;
  sd_card_2tb_rental: string | null;
  sd_card_480gb_rental: string | null;
  sd_card_256gb_rental: string | null;
  sd_card_512gb_rental: string | null;
  sd_card_250gb_rental: string | null;
  mic_rental: string | null;
  speaker_rental: string | null;
  pfk_main_unit_rental: string | null;
  pfk_main_unit_sub: string | null;
  breathaloc_rental: string | null;
  pfk_road_facing_rental: string | null;
  pfk_driver_facing_rental: string | null;
  pfk_dome_1_rental: string | null;
  pfk_dome_2_rental: string | null;
  pfk_5m_rental: string | null;
  pfk_10m_rental: string | null;
  pfk_15m_rental: string | null;
  pfk_20m_rental: string | null;
  roller_door_switches_rental: string | null;
  consultancy: string | null;
  roaming: string | null;
  maintenance: string | null;
  after_hours: string | null;
  controlroom: string | null;
  software: string | null;
  additional_data: string | null;
  total_rental: number | null;
  total_sub: number | null;
  total_rental_sub: number | null;
}

export interface VehiclesResponse {
  success: boolean;
  vehicles: Vehicle[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  error?: string;
}

export async function getVehiclesByAccountNumber(
  accountNumber: string,
  page: number = 1,
  limit: number = 10
): Promise<VehiclesResponse> {
  try {
    const supabase = await createClient();
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // First, try direct match with URL parameter (best approach)
    let searchAccountNumber = accountNumber;
    
    // Get the total count with direct match
    const { count: totalCount, error: countError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('new_account_number', searchAccountNumber);
    
    // If no vehicles found with direct match, try fallback to cost_centers table
    if ((totalCount === 0 || countError) && accountNumber.includes('-')) {
      console.log('No vehicles found with direct match, trying cost_centers fallback for:', accountNumber);
      
      // Query cost_centers table to get the cost_code
      const { data: costCenter, error: costCenterError } = await supabase
        .from('cost_centers')
        .select('cost_code')
        .eq('cost_code', accountNumber)
        .single();
      
      if (!costCenterError && costCenter?.cost_code) {
        searchAccountNumber = costCenter.cost_code;
        console.log('Found cost_code from cost_centers table:', searchAccountNumber);
        
        // Retry count with the cost_code from cost_centers
        const { count: fallbackCount, error: fallbackCountError } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('new_account_number', searchAccountNumber);
        
        if (fallbackCountError) {
          console.error('Error counting vehicles with fallback:', fallbackCountError);
          return {
            success: false,
            vehicles: [],
            totalCount: 0,
            currentPage: page,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
            error: 'Failed to count vehicles'
          };
        }
        
        // Update totalCount with fallback result
        const finalCount = fallbackCount || 0;
        const totalPages = Math.ceil(finalCount / limit);
        
        // Get the paginated results with fallback account number
        const { data: vehicles, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('new_account_number', searchAccountNumber)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (error) {
          console.error('Error fetching vehicles with fallback:', error);
          return {
            success: false,
            vehicles: [],
            totalCount: 0,
            currentPage: page,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
            error: 'Failed to fetch vehicles'
          };
        }
        
        return {
          success: true,
          vehicles: vehicles || [],
          totalCount: finalCount,
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        };
      }
    }
    
    // Handle original count error if no fallback was needed or fallback failed
    if (countError) {
      console.error('Error counting vehicles:', countError);
      return {
        success: false,
        vehicles: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        error: 'Failed to count vehicles'
      };
    }
    
    // Get the paginated results with original account number
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('new_account_number', searchAccountNumber)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching vehicles:', error);
      return {
        success: false,
        vehicles: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        error: 'Failed to fetch vehicles'
      };
    }
    
    const totalPages = Math.ceil((totalCount || 0) / limit);
    
    return {
      success: true,
      vehicles: vehicles || [],
      totalCount: totalCount || 0,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
    
  } catch (error) {
    console.error('Unexpected error in getVehiclesByAccountNumber:', error);
    console.error('Account number:', accountNumber);
    console.error('Page:', page);
    console.error('Limit:', limit);
    return {
      success: false,
      vehicles: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
