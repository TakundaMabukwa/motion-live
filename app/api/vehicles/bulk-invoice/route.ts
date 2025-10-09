import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch all vehicles grouped by new_account_number
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('new_account_number', { ascending: true });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

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

    // Fetch customer details for each account number
    const customerDetails = {};
    for (const accountNumber of accountNumbers) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('legal_name, company, trading_name, email, physical_address_1, physical_address_2, physical_area, physical_province, physical_code')
        .or(`new_account_number.eq.${accountNumber},account_number.eq.${accountNumber}`)
        .single();

      if (!customerError && customer) {
        customerDetails[accountNumber] = customer;
      }
    }

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
    });

  } catch (error) {
    console.error('Error in bulk invoice API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
