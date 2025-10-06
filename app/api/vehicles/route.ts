import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.reg || !body.new_account_number) {
      return NextResponse.json({ 
        error: 'Missing required fields: reg and new_account_number are required' 
      }, { status: 400 });
    }

    // Prepare vehicle data for the new comprehensive vehicles table
    const vehicleData = {
      reg: body.reg,
      vin: body.vin || null,
      make: body.make || null,
      model: body.model || null,
      year: body.year || null,
      colour: body.colour || 'Unknown',
      company: body.company || body.new_account_number,
      new_account_number: body.new_account_number,
      branch: body.branch || null,
      fleet_number: body.fleet_number || null,
      engine: body.engine || null,
      
      // IP addresses for different equipment types
      skylink_trailer_unit_ip: body.skylink_trailer_unit_ip || null,
      sky_on_batt_ign_unit_ip: body.sky_on_batt_ign_unit_ip || null,
      skylink_voice_kit_ip: body.skylink_voice_kit_ip || null,
      sky_scout_12v_ip: body.sky_scout_12v_ip || null,
      sky_scout_24v_ip: body.sky_scout_24v_ip || null,
      skylink_pro_ip: body.skylink_pro_ip || null,
      
      // Financial information
      total_rental_sub: body.total_rental_sub || 0,
      total_rental: body.total_rental || 0,
      total_sub: body.total_sub || 0,
      
      // Additional fields that might be provided
      skylink_trailer_unit_serial_number: body.skylink_trailer_unit_serial_number || null,
      sky_on_batt_ign_unit_serial_number: body.sky_on_batt_ign_unit_serial_number || null,
      skylink_voice_kit_serial_number: body.skylink_voice_kit_serial_number || null,
      sky_scout_12v_serial_number: body.sky_scout_12v_serial_number || null,
      sky_scout_24v_serial_number: body.sky_scout_24v_serial_number || null,
      skylink_pro_serial_number: body.skylink_pro_serial_number || null,
      
      // SIM card information
      skylink_sim_card_no: body.skylink_sim_card_no || null,
      skylink_data_number: body.skylink_data_number || null,
      sim_card_number: body.sim_card_number || null,
      data_number: body.data_number || null,
      corpconnect_sim_no: body.corpconnect_sim_no || null,
      corpconnect_data_no: body.corpconnect_data_no || null,
      pfk_corpconnect_sim_number: body.pfk_corpconnect_sim_number || null,
      pfk_corpconnect_data_number: body.pfk_corpconnect_data_number || null,
      
      // Equipment fields
      beame_1: body.beame_1 || null,
      beame_2: body.beame_2 || null,
      beame_3: body.beame_3 || null,
      beame_4: body.beame_4 || null,
      beame_5: body.beame_5 || null,
      
      // Rental and subscription amounts
      skylink_trailer_unit_rental: body.skylink_trailer_unit_rental || null,
      skylink_trailer_sub: body.skylink_trailer_sub || null,
      sky_on_batt_ign_rental: body.sky_on_batt_ign_rental || null,
      sky_on_batt_sub: body.sky_on_batt_sub || null,
      skylink_voice_kit_rental: body.skylink_voice_kit_rental || null,
      skylink_voice_kit_sub: body.skylink_voice_kit_sub || null,
      sky_scout_12v_rental: body.sky_scout_12v_rental || null,
      sky_scout_12v_sub: body.sky_scout_12v_sub || null,
      sky_scout_24v_rental: body.sky_scout_24v_rental || null,
      sky_scout_24v_sub: body.sky_scout_24v_sub || null,
      skylink_pro_rental: body.skylink_pro_rental || null,
      skylink_pro_sub: body.skylink_pro_sub || null,
      
      // Additional service fields
      consultancy: body.consultancy || null,
      roaming: body.roaming || null,
      maintenance: body.maintenance || null,
      after_hours: body.after_hours || null,
      controlroom: body.controlroom || null
    };

    // Insert into vehicles table
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicleData)
      .select()
      .single();

    if (error) {
      console.error('Error adding vehicle to vehicles table:', error);
      return NextResponse.json({ error: 'Failed to add vehicle to vehicles table' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vehicle: data,
      message: 'Vehicle added to vehicles table successfully'
    });

  } catch (error) {
    console.error('Error in vehicles POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by account number if provided
    if (accountNumber) {
      query = query.eq('new_account_number', accountNumber);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vehicles: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Error in vehicles GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
