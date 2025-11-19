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
    
    // Add cache headers for 5 minutes
    const headers = {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
    };
    
    // Fetch vehicles and customers in parallel
    const [vehiclesResult, customersResult] = await Promise.all([
      // Fetch all vehicles in one query (remove pagination for speed)
      supabase
        .from('vehicles')
        .select('reg, fleet_number, company, account_number, new_account_number, total_rental_sub, total_rental, total_sub, skylink_trailer_unit_serial_number, skylink_pro_serial_number, sky_on_batt_ign_unit_serial_number, skylink_voice_kit_serial_number, sky_scout_12v_serial_number, sky_scout_24v_serial_number, _4ch_mdvr, _5ch_mdvr, _8ch_mdvr, a2_dash_cam, a3_dash_cam_ai, pfk_main_unit, breathaloc, consultancy, maintenance, after_hours, controlroom, roaming')
        .not('new_account_number', 'is', null)
        .order('new_account_number', { ascending: true }),
      
      // Fetch all customers in parallel
      supabase
        .from('customers')
        .select('legal_name, company, trading_name, new_account_number, account_number')
    ]);
    
    console.timeEnd('Vehicle Fetch');
    
    if (vehiclesResult.error) {
      console.error('Error fetching vehicles:', vehiclesResult.error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }
    
    const vehicles = vehiclesResult.data || [];



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

    // Use customers data from parallel fetch
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
