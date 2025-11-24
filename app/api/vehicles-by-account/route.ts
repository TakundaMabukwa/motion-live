import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('account_number');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    console.log('Fetching vehicles for account number:', accountNumber, 'page:', page, 'limit:', limit);

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build the query with pagination - only match exact cost code
    let query = supabase
      .from('vehicles')
      .select('*', { count: 'exact' })
      .eq('new_account_number', accountNumber);

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: vehicles, error, count } = await query;

    console.log('Database query result:', { vehicles: vehicles?.length || 0, error, count });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    console.log('Found vehicles:', vehicles?.length || 0, 'of', count || 0);

    // Transform the data to match expected format for vehicles table
    const transformedVehicles = vehicles?.map(vehicle => ({
      id: vehicle.id,
      created_at: vehicle.created_at,
      company: vehicle.company || '',
      new_account_number: vehicle.new_account_number || '',
      branch: vehicle.branch || '',
      unique_id: vehicle.unique_id || '',
      fleet_number: vehicle.fleet_number || '',
      reg: vehicle.reg || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      vin: vehicle.vin || '',
      engine: vehicle.engine || '',
      year: vehicle.year || '',
      colour: vehicle.colour || '',
      // Include all the skylink and other fields
      skylink_trailer_unit_serial_number: vehicle.skylink_trailer_unit_serial_number || '',
      skylink_trailer_unit_ip: vehicle.skylink_trailer_unit_ip || '',
      sky_on_batt_ign_unit_serial_number: vehicle.sky_on_batt_ign_unit_serial_number || '',
      sky_on_batt_ign_unit_ip: vehicle.sky_on_batt_ign_unit_ip || '',
      skylink_voice_kit_serial_number: vehicle.skylink_voice_kit_serial_number || '',
      skylink_voice_kit_ip: vehicle.skylink_voice_kit_ip || '',
      sky_scout_12v_serial_number: vehicle.sky_scout_12v_serial_number || '',
      sky_scout_12v_ip: vehicle.sky_scout_12v_ip || '',
      sky_scout_24v_serial_number: vehicle.sky_scout_24v_serial_number || '',
      sky_scout_24v_ip: vehicle.sky_scout_24v_ip || '',
      skylink_pro_serial_number: vehicle.skylink_pro_serial_number || '',
      skylink_pro_ip: vehicle.skylink_pro_ip || '',
      skylink_sim_card_no: vehicle.skylink_sim_card_no || '',
      skylink_data_number: vehicle.skylink_data_number || '',
      sky_safety: vehicle.sky_safety || '',
      sky_idata: vehicle.sky_idata || '',
      sky_ican: vehicle.sky_ican || '',
      industrial_panic: vehicle.industrial_panic || '',
      flat_panic: vehicle.flat_panic || '',
      buzzer: vehicle.buzzer || '',
      tag: vehicle.tag || '',
      tag_reader: vehicle.tag_reader || '',
      keypad: vehicle.keypad || '',
      keypad_waterproof: vehicle.keypad_waterproof || '',
      early_warning: vehicle.early_warning || '',
      cia: vehicle.cia || '',
      fm_unit: vehicle.fm_unit || '',
      sim_card_number: vehicle.sim_card_number || '',
      data_number: vehicle.data_number || '',
      gps: vehicle.gps || '',
      gsm: vehicle.gsm || '',
      tag_: vehicle.tag_ || '',
      tag_reader_: vehicle.tag_reader_ || '',
      main_fm_harness: vehicle.main_fm_harness || '',
      beame_1: vehicle.beame_1 || '',
      beame_2: vehicle.beame_2 || '',
      beame_3: vehicle.beame_3 || '',
      beame_4: vehicle.beame_4 || '',
      beame_5: vehicle.beame_5 || '',
      fuel_probe_1: vehicle.fuel_probe_1 || '',
      fuel_probe_2: vehicle.fuel_probe_2 || '',
      _7m_harness_for_probe: vehicle._7m_harness_for_probe || '',
      tpiece: vehicle.tpiece || '',
      idata: vehicle.idata || '',
      _1m_extension_cable: vehicle._1m_extension_cable || '',
      _3m_extension_cable: vehicle._3m_extension_cable || '',
      _4ch_mdvr: vehicle._4ch_mdvr || '',
      _5ch_mdvr: vehicle._5ch_mdvr || '',
      _8ch_mdvr: vehicle._8ch_mdvr || '',
      a2_dash_cam: vehicle.a2_dash_cam || '',
      a3_dash_cam_ai: vehicle.a3_dash_cam_ai || '',
      corpconnect_sim_no: vehicle.corpconnect_sim_no || '',
      corpconnect_data_no: vehicle.corpconnect_data_no || '',
      sim_id: vehicle.sim_id || '',
      _5m_cable_for_camera_4pin: vehicle._5m_cable_for_camera_4pin || '',
      _5m_cable_6pin: vehicle._5m_cable_6pin || '',
      _10m_cable_for_camera_4pin: vehicle._10m_cable_for_camera_4pin || '',
      a2_mec_5: vehicle.a2_mec_5 || '',
      vw400_dome_1: vehicle.vw400_dome_1 || '',
      vw400_dome_2: vehicle.vw400_dome_2 || '',
      vw300_dakkie_dome_1: vehicle.vw300_dakkie_dome_1 || '',
      vw300_dakkie_dome_2: vehicle.vw300_dakkie_dome_2 || '',
      vw502_dual_lens_camera: vehicle.vw502_dual_lens_camera || '',
      vw303_driver_facing_camera: vehicle.vw303_driver_facing_camera || '',
      vw502f_road_facing_camera: vehicle.vw502f_road_facing_camera || '',
      vw306_dvr_road_facing_for_4ch_8ch: vehicle.vw306_dvr_road_facing_for_4ch_8ch || '',
      vw306m_a2_dash_cam: vehicle.vw306m_a2_dash_cam || '',
      dms01_driver_facing: vehicle.dms01_driver_facing || '',
      adas_02_road_facing: vehicle.adas_02_road_facing || '',
      vw100ip_driver_facing_ip: vehicle.vw100ip_driver_facing_ip || '',
      sd_card_1tb: vehicle.sd_card_1tb || '',
      sd_card_2tb: vehicle.sd_card_2tb || '',
      sd_card_480gb: vehicle.sd_card_480gb || '',
      sd_card_256gb: vehicle.sd_card_256gb || '',
      sd_card_512gb: vehicle.sd_card_512gb || '',
      sd_card_250gb: vehicle.sd_card_250gb || '',
      mic: vehicle.mic || '',
      speaker: vehicle.speaker || '',
      pfk_main_unit: vehicle.pfk_main_unit || '',
      pfk_corpconnect_sim_number: vehicle.pfk_corpconnect_sim_number || '',
      pfk_corpconnect_data_number: vehicle.pfk_corpconnect_data_number || '',
      breathaloc: vehicle.breathaloc || '',
      pfk_road_facing: vehicle.pfk_road_facing || '',
      pfk_driver_facing: vehicle.pfk_driver_facing || '',
      pfk_dome_1: vehicle.pfk_dome_1 || '',
      pfk_dome_2: vehicle.pfk_dome_2 || '',
      pfk_5m: vehicle.pfk_5m || '',
      pfk_10m: vehicle.pfk_10m || '',
      pfk_15m: vehicle.pfk_15m || '',
      pfk_20m: vehicle.pfk_20m || '',
      roller_door_switches: vehicle.roller_door_switches || '',
      account_number: vehicle.account_number || '',
      // Include rental and subscription fields
      skylink_trailer_unit_rental: vehicle.skylink_trailer_unit_rental || '',
      skylink_trailer_sub: vehicle.skylink_trailer_sub || '',
      sky_on_batt_ign_rental: vehicle.sky_on_batt_ign_rental || '',
      sky_on_batt_sub: vehicle.sky_on_batt_sub || '',
      skylink_voice_kit_rental: vehicle.skylink_voice_kit_rental || '',
      skylink_voice_kit_sub: vehicle.skylink_voice_kit_sub || '',
      sky_scout_12v_rental: vehicle.sky_scout_12v_rental || '',
      sky_scout_12v_sub: vehicle.sky_scout_12v_sub || '',
      sky_scout_24v_rental: vehicle.sky_scout_24v_rental || '',
      sky_scout_24v_sub: vehicle.sky_scout_24v_sub || '',
      skylink_pro_rental: vehicle.skylink_pro_rental || '',
      skylink_pro_sub: vehicle.skylink_pro_sub || '',
      sky_idata_rental: vehicle.sky_idata_rental || '',
      sky_ican_rental: vehicle.sky_ican_rental || '',
      industrial_panic_rental: vehicle.industrial_panic_rental || '',
      flat_panic_rental: vehicle.flat_panic_rental || '',
      buzzer_rental: vehicle.buzzer_rental || '',
      tag_rental: vehicle.tag_rental || '',
      tag_reader_rental: vehicle.tag_reader_rental || '',
      keypad_rental: vehicle.keypad_rental || '',
      early_warning_rental: vehicle.early_warning_rental || '',
      cia_rental: vehicle.cia_rental || '',
      fm_unit_rental: vehicle.fm_unit_rental || '',
      fm_unit_sub: vehicle.fm_unit_sub || '',
      gps_rental: vehicle.gps_rental || '',
      gsm_rental: vehicle.gsm_rental || '',
      tag_rental_: vehicle.tag_rental_ || '',
      tag_reader_rental_: vehicle.tag_reader_rental_ || '',
      main_fm_harness_rental: vehicle.main_fm_harness_rental || '',
      beame_1_rental: vehicle.beame_1_rental || '',
      beame_1_sub: vehicle.beame_1_sub || '',
      beame_2_rental: vehicle.beame_2_rental || '',
      beame_2_sub: vehicle.beame_2_sub || '',
      beame_3_rental: vehicle.beame_3_rental || '',
      beame_3_sub: vehicle.beame_3_sub || '',
      beame_4_rental: vehicle.beame_4_rental || '',
      beame_4_sub: vehicle.beame_4_sub || '',
      beame_5_rental: vehicle.beame_5_rental || '',
      beame_5_sub: vehicle.beame_5_sub || '',
      single_probe_rental: vehicle.single_probe_rental || '',
      single_probe_sub: vehicle.single_probe_sub || '',
      dual_probe_rental: vehicle.dual_probe_rental || '',
      dual_probe_sub: vehicle.dual_probe_sub || '',
      _7m_harness_for_probe_rental: vehicle._7m_harness_for_probe_rental || '',
      tpiece_rental: vehicle.tpiece_rental || '',
      idata_rental: vehicle.idata_rental || '',
      _1m_extension_cable_rental: vehicle._1m_extension_cable_rental || '',
      _3m_extension_cable_rental: vehicle._3m_extension_cable_rental || '',
      _4ch_mdvr_rental: vehicle._4ch_mdvr_rental || '',
      _4ch_mdvr_sub: vehicle._4ch_mdvr_sub || '',
      _5ch_mdvr_rental: vehicle._5ch_mdvr_rental || '',
      _5ch_mdvr_sub: vehicle._5ch_mdvr_sub || '',
      _8ch_mdvr_rental: vehicle._8ch_mdvr_rental || '',
      _8ch_mdvr_sub: vehicle._8ch_mdvr_sub || '',
      a2_dash_cam_rental: vehicle.a2_dash_cam_rental || '',
      a2_dash_cam_sub: vehicle.a2_dash_cam_sub || '',
      a3_dash_cam_ai_rental: vehicle.a3_dash_cam_ai_rental || '',
      _5m_cable_for_camera_4pin_rental: vehicle._5m_cable_for_camera_4pin_rental || '',
      _5m_cable_6pin_rental: vehicle._5m_cable_6pin_rental || '',
      _10m_cable_for_camera_4pin_rental: vehicle._10m_cable_for_camera_4pin_rental || '',
      a2_mec_5_rental: vehicle.a2_mec_5_rental || '',
      vw400_dome_1_rental: vehicle.vw400_dome_1_rental || '',
      vw400_dome_2_rental: vehicle.vw400_dome_2_rental || '',
      vw300_dakkie_dome_1_rental: vehicle.vw300_dakkie_dome_1_rental || '',
      vw300_dakkie_dome_2_rental: vehicle.vw300_dakkie_dome_2_rental || '',
      vw502_dual_lens_camera_rental: vehicle.vw502_dual_lens_camera_rental || '',
      vw303_driver_facing_camera_rental: vehicle.vw303_driver_facing_camera_rental || '',
      vw502f_road_facing_camera_rental: vehicle.vw502f_road_facing_camera_rental || '',
      vw306_dvr_road_facing_for_4ch_8ch_rental: vehicle.vw306_dvr_road_facing_for_4ch_8ch_rental || '',
      vw306m_a2_dash_cam_rental: vehicle.vw306m_a2_dash_cam_rental || '',
      dms01_driver_facing_rental: vehicle.dms01_driver_facing_rental || '',
      adas_02_road_facing_rental: vehicle.adas_02_road_facing_rental || '',
      vw100ip_driver_facing_rental: vehicle.vw100ip_driver_facing_rental || '',
      sd_card_1tb_rental: vehicle.sd_card_1tb_rental || '',
      sd_card_2tb_rental: vehicle.sd_card_2tb_rental || '',
      sd_card_480gb_rental: vehicle.sd_card_480gb_rental || '',
      sd_card_256gb_rental: vehicle.sd_card_256gb_rental || '',
      sd_card_512gb_rental: vehicle.sd_card_512gb_rental || '',
      sd_card_250gb_rental: vehicle.sd_card_250gb_rental || '',
      mic_rental: vehicle.mic_rental || '',
      speaker_rental: vehicle.speaker_rental || '',
      pfk_main_unit_rental: vehicle.pfk_main_unit_rental || '',
      pfk_main_unit_sub: vehicle.pfk_main_unit_sub || '',
      breathaloc_rental: vehicle.breathaloc_rental || '',
      pfk_road_facing_rental: vehicle.pfk_road_facing_rental || '',
      pfk_driver_facing_rental: vehicle.pfk_driver_facing_rental || '',
      pfk_dome_1_rental: vehicle.pfk_dome_1_rental || '',
      pfk_dome_2_rental: vehicle.pfk_dome_2_rental || '',
      pfk_5m_rental: vehicle.pfk_5m_rental || '',
      pfk_10m_rental: vehicle.pfk_10m_rental || '',
      pfk_15m_rental: vehicle.pfk_15m_rental || '',
      pfk_20m_rental: vehicle.pfk_20m_rental || '',
      roller_door_switches_rental: vehicle.roller_door_switches_rental || '',
      consultancy: vehicle.consultancy || '',
      roaming: vehicle.roaming || '',
      maintenance: vehicle.maintenance || '',
      after_hours: vehicle.after_hours || '',
      controlroom: vehicle.controlroom || '',
      total_rental: vehicle.total_rental || 0,
      total_sub: vehicle.total_sub || 0,
      total_rental_sub: vehicle.total_rental_sub || 0
    })) || [];

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      vehicles: transformedVehicles,
      totalCount: count || 0,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      limit
    });

  } catch (error) {
    console.error('Error in vehicles by account GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountNumber } = body;

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    // Create test vehicles for vehicles table
    const testVehicles = [
      {
        registration_number: 'TEST001',
        engine_number: 'ENG001',
        vin_number: 'VIN001' + Date.now(),
        make: 'Toyota',
        model: 'Hilux',
        manufactured_year: 2020,
        vehicle_type: 'truck',
        registration_date: '2020-01-01',
        license_expiry_date: '2025-01-01',
        fuel_type: 'petrol',
        transmission_type: 'manual',
        service_intervals_km: 10000,
        color: 'white',
        company: accountNumber,
        group_name: 'TEST001',
        new_registration: 'TEST001',
        new_account_number: accountNumber,
        active: true
      },
      {
        registration_number: 'TEST002',
        engine_number: 'ENG002',
        vin_number: 'VIN002' + Date.now(),
        make: 'Ford',
        model: 'Ranger',
        manufactured_year: 2021,
        vehicle_type: 'truck',
        registration_date: '2021-01-01',
        license_expiry_date: '2026-01-01',
        fuel_type: 'petrol',
        transmission_type: 'manual',
        service_intervals_km: 10000,
        color: 'blue',
        company: accountNumber,
        group_name: 'TEST002',
        new_registration: 'TEST002',
        new_account_number: accountNumber,
        active: true
      }
    ];

    const { data, error } = await supabase
      .from('vehicles')
      .insert(testVehicles)
      .select('*');

    if (error) {
      console.error('Error creating test vehicles:', error);
      return NextResponse.json({ error: 'Failed to create test vehicles', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Test vehicles created successfully',
      vehicles: data
    });

  } catch (error) {
    console.error('Error in vehicles POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 