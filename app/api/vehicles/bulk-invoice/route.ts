import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.time('Total API Time');
    console.time('Vehicle Fetch');
    
    // Disable cache for debugging
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
    
    // Fetch all vehicles with pagination (Supabase max 1000 per query)
    let allVehicles = [];
    let page = 0;
    const pageSize = 1000; // Supabase max limit
    let hasMore = true;

    while (hasMore) {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, reg, fleet_number, company, account_number, new_account_number, total_rental_sub, total_rental, total_sub, skylink_trailer_unit_serial_number, skylink_pro_serial_number, sky_on_batt_ign_unit_serial_number, skylink_voice_kit_serial_number, sky_scout_12v_serial_number, sky_scout_24v_serial_number, _4ch_mdvr, _5ch_mdvr, _8ch_mdvr, a2_dash_cam, a3_dash_cam_ai, pfk_main_unit, breathaloc, consultancy, maintenance, after_hours, controlroom, roaming, sky_safety, sky_idata, sky_ican, industrial_panic, flat_panic, buzzer, tag, tag_reader, keypad, keypad_waterproof, early_warning, cia, fm_unit, gps, gsm, main_fm_harness, beame_1, beame_2, beame_3, beame_4, beame_5, fuel_probe_1, fuel_probe_2, _7m_harness_for_probe, tpiece, idata, _1m_extension_cable, _3m_extension_cable, vw400_dome_1, vw400_dome_2, vw300_dakkie_dome_1, vw300_dakkie_dome_2, vw502_dual_lens_camera, vw303_driver_facing_camera, vw502f_road_facing_camera, dms01_driver_facing, adas_02_road_facing, vw100ip_driver_facing_ip, sd_card_1tb, sd_card_2tb, sd_card_480gb, sd_card_256gb, sd_card_512gb, sd_card_250gb, mic, speaker, pfk_road_facing, pfk_driver_facing, pfk_dome_1, pfk_dome_2, roller_door_switches')
        .not('new_account_number', 'is', null)
        .order('new_account_number', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching vehicles:', error);
        return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
      }

      allVehicles = allVehicles.concat(vehicles || []);
      console.log(`Fetched page ${page + 1}: ${vehicles?.length || 0} vehicles (total so far: ${allVehicles.length})`);
      hasMore = (vehicles?.length || 0) === pageSize;
      page++;
    }
    
    // Fetch customers in parallel while vehicles are being processed
    const customersResult = await supabase
      .from('customers')
      .select('legal_name, company, trading_name, new_account_number, account_number');
    
    console.timeEnd('Vehicle Fetch');
    
    const vehicles = allVehicles;



    // Group vehicles by new_account_number
    const groupedVehicles = vehicles.reduce((acc, vehicle) => {
      const accountNumber = vehicle.new_account_number;
      
      // Handle vehicles with null/empty account numbers
      if (!accountNumber || accountNumber.trim() === '') {
        console.warn(`Vehicle ${vehicle.id} has empty account number - skipping`);
        return acc;
      }
      
      if (!acc[accountNumber]) {
        acc[accountNumber] = [];
      }
      acc[accountNumber].push(vehicle);
      return acc;
    }, {} as Record<string, any[]>);

    // Log statistics about vehicles processed
    const totalVehiclesProcessed = Object.values(groupedVehicles).reduce((sum, vehicles) => sum + vehicles.length, 0);
    const vehiclesWithEmptyAccount = vehicles.length - totalVehiclesProcessed;
    
    console.log(`Bulk Invoice Stats:`);
    console.log(`- Total vehicles fetched: ${vehicles.length}`);
    console.log(`- Vehicles with valid account numbers: ${totalVehiclesProcessed}`);
    console.log(`- Vehicles with empty/null account numbers: ${vehiclesWithEmptyAccount}`);
    console.log(`- Unique account numbers: ${Object.keys(groupedVehicles).length}`);

    // Get unique account numbers
    const accountNumbers = Object.keys(groupedVehicles);

    // Use customers data from fetch
    const customerDetails = {};
    if (!customersResult.error && customersResult.data) {
      customersResult.data.forEach(customer => {
        const key = customer.new_account_number || customer.account_number;
        if (key && accountNumbers.includes(key)) {
          customerDetails[key] = customer;
        }
      });
    }
    
    console.timeEnd('Total API Time');

    // Calculate totals for each account
    const accountTotals = {};
    Object.entries(groupedVehicles).forEach(([accountNumber, vehicles]) => {
      const totalRental = vehicles.reduce((sum, vehicle) => sum + (parseFloat(vehicle.total_rental) || 0), 0);
      const totalSub = vehicles.reduce((sum, vehicle) => sum + (parseFloat(vehicle.total_sub) || 0), 0);
      const totalRentalSub = vehicles.reduce((sum, vehicle) => sum + (parseFloat(vehicle.total_rental_sub) || 0), 0);
      
      accountTotals[accountNumber] = {
        totalRental,
        totalSub,
        totalRentalSub,
        vehicleCount: vehicles.length
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        groupedVehicles,
        customerDetails,
        accountTotals,
        totalAccounts: accountNumbers.length,
        totalVehicles: vehicles.length
      }
    }, { headers });

  } catch (error) {
    console.error('Error in bulk invoice API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
