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

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    console.log('Fetching vehicles for account number:', accountNumber);

    // First, let's see all vehicles in the database
    const { data: allVehicles, error: allError } = await supabase
      .from('vehicles_ip')
      .select('*')
      .limit(10);

    console.log('All vehicles in database:', allVehicles?.length || 0);
    console.log('Sample vehicles:', allVehicles?.slice(0, 3));

    // Fetch vehicles from vehicles_ip table that match the new_account_number
    const { data: vehicles, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('new_account_number', accountNumber);
      // .eq('active', true); // Temporarily removed to debug

    console.log('Database query result:', { vehicles: vehicles?.length || 0, error });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    console.log('Found vehicles:', vehicles?.length || 0);
    console.log('Sample vehicle:', vehicles?.[0]);

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
      vehicles: transformedVehicles,
      count: transformedVehicles.length
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

    // Create test vehicles
    const testVehicles = [
      {
        new_account_number: accountNumber,
        group_name: 'TEST001',
        new_registration: 'TEST001',
        beame_1: 'Toyota',
        beame_2: 'Hilux',
        beame_3: '2020',
        company: 'Test Company',
        active: true,
        products: ['GPS', 'Tracker']
      },
      {
        new_account_number: accountNumber,
        group_name: 'TEST002',
        new_registration: 'TEST002',
        beame_1: 'Ford',
        beame_2: 'Ranger',
        beame_3: '2021',
        company: 'Test Company',
        active: true,
        products: ['GPS', 'Tracker']
      }
    ];

    const { data, error } = await supabase
      .from('vehicles_ip')
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