import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Temporarily disable authentication for testing
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const accountNumber = searchParams.get('accountNumber');

    if (!company && !accountNumber) {
      return NextResponse.json({ error: 'Company name or account number is required' }, { status: 400 });
    }

    console.log('Fetching vehicles for:', { company, accountNumber });

    let query = supabase.from('vehicles_ip').select('*');

    if (accountNumber) {
      // If account number is provided, use exact match
      query = query.eq('new_account_number', accountNumber);
    } else if (company) {
      // If company name is provided, search by company
      query = query.ilike('company', `%${company}%`);
    }

    const { data: vehicles, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    console.log('Found vehicles:', vehicles?.length || 0);

    // Transform the data to match expected format with group_name as plate
    const transformedVehicles = vehicles?.map(vehicle => ({
      id: vehicle.id,
      plate_number: vehicle.group_name || vehicle.new_registration || 'Unknown',
      vehicle_make: vehicle.beame_1 || '',
      vehicle_model: vehicle.beame_2 || '',
      vehicle_year: vehicle.beame_3 || '',
      ip_address: vehicle.ip_address || '',
      company: vehicle.company || '',
      comment: vehicle.comment || '',
      products: vehicle.products || [],
      active: vehicle.active,
      group_name: vehicle.group_name,
      new_account_number: vehicle.new_account_number,
      // Add additional fields for compatibility
      make: vehicle.beame_1 || '',
      model: vehicle.beame_2 || '',
      year: vehicle.beame_3 || '',
      vin_number: vehicle.group_name || vehicle.new_registration || 'Unknown',
      registration_number: vehicle.group_name || vehicle.new_registration || 'Unknown',
      registration: vehicle.group_name || vehicle.new_registration || 'Unknown'
    })) || [];

    return NextResponse.json({
      success: true,
      vehicles: transformedVehicles,
      count: transformedVehicles.length
    });

  } catch (error) {
    console.error('Error in vehicles by company GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
