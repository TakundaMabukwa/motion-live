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
    const accountNumber = searchParams.get('accountNumber');
    const account_number = searchParams.get('account_number');

    console.log('Debug vehicle fetch - accountNumber:', accountNumber, 'account_number:', account_number);

    if (!accountNumber && !account_number) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    const searchAccountNumber = accountNumber || account_number;

    console.log('Searching for account number:', searchAccountNumber);

    // First, let's see all vehicles in the database
    const { data: allVehicles, error: allError } = await supabase
      .from('vehicles_ip')
      .select('*')
      .limit(5);

    console.log('All vehicles in database:', allVehicles?.length || 0);
    console.log('Sample vehicles:', allVehicles?.slice(0, 3));

    // Check if the account number exists in the database
    const { data: accountCheck, error: accountError } = await supabase
      .from('vehicles_ip')
      .select('new_account_number')
      .eq('new_account_number', searchAccountNumber);

    console.log('Account check result:', { found: accountCheck?.length || 0, error: accountError });

    // Fetch vehicles from vehicles_ip table that match the new_account_number
    const { data: vehicles, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('new_account_number', searchAccountNumber);

    console.log('Database query result:', { vehicles: vehicles?.length || 0, error });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch vehicles',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    console.log('Found vehicles:', vehicles?.length || 0);
    if (vehicles && vehicles.length > 0) {
      console.log('Sample vehicle:', vehicles[0]);
    }

    // Transform the data to match expected format
    const transformedVehicles = vehicles?.map(vehicle => ({
      id: vehicle.id,
      plate_number: vehicle.new_registration || vehicle.group_name,
      vehicle_make: vehicle.beame_1 || '',
      vehicle_model: vehicle.beame_2 || '',
      vehicle_year: vehicle.beame_3 || '',
      ip_address: vehicle.ip_address || '',
      company: vehicle.company || '',
      comment: vehicle.comment || '',
      products: vehicle.products || [],
      active: vehicle.active,
      group_name: vehicle.group_name,
      new_account_number: vehicle.new_account_number
    })) || [];

    return NextResponse.json({
      success: true,
      vehicles: transformedVehicles,
      count: transformedVehicles.length,
      debug: {
        searchAccountNumber,
        allVehiclesCount: allVehicles?.length || 0,
        accountCheckCount: accountCheck?.length || 0,
        foundVehiclesCount: vehicles?.length || 0
      }
    });

  } catch (error) {
    console.error('Error in debug vehicle fetch:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
