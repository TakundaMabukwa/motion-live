import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const registration = searchParams.get('registration');
    const vin = searchParams.get('vin');

    // If both parameters are empty or missing, return all vehicles
    if ((!registration || registration.trim() === '') && (!vin || vin.trim() === '')) {
      const supabase = await createClient();
      const { data: vehicles, error } = await supabase.from('vehicles_ip').select('*');
      
      if (error) {
        console.error('Error fetching all vehicles:', error);
        return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
      }
      
      return NextResponse.json({ vehicles: vehicles || [] });
    }

    const supabase = await createClient();
    
    // Build query based on available parameters
    let query = supabase.from('vehicles_ip').select('*');
    
    if (registration && registration.trim() !== '') {
      query = query.eq('new_registration', registration);
    }
    
    if (vin && vin.trim() !== '') {
      query = query.eq('vin_number', vin);
    }

    const { data: vehicles, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    return NextResponse.json({ vehicles: vehicles || [] });

  } catch (error) {
    console.error('Error in vehicles-ip GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Vehicles-IP POST request body:', body);
    
    const {
      new_registration,
      new_account_number,
      vin_number,
      company,
      comment,
      group_name,
      ip_address,
      active = true
    } = body;

    if (!new_registration || new_registration.trim() === '') {
      return NextResponse.json({ 
        error: 'Registration is required and cannot be empty' 
      }, { status: 400 });
    }
    
    if (!new_account_number || new_account_number.trim() === '') {
      return NextResponse.json({ 
        error: 'Account Number is required and cannot be empty' 
      }, { status: 400 });
    }

    // Check if vehicle already exists
    const { data: existingVehicle, error: checkError } = await supabase
      .from('vehicles_ip')
      .select('id')
      .eq('new_registration', new_registration)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing vehicle:', checkError);
      return NextResponse.json({ error: 'Failed to check existing vehicle' }, { status: 500 });
    }

    if (existingVehicle) {
      return NextResponse.json({ 
        error: 'Vehicle with this registration already exists' 
      }, { status: 409 });
    }

    // Insert new vehicle
    const { data: newVehicle, error: insertError } = await supabase
      .from('vehicles_ip')
      .insert({
        new_registration,
        new_account_number,
        vin_number,
        company,
        comment,
        group_name: group_name || new_registration, // Default to registration if not provided
        ip_address,
        active,
        products: [], // Initialize empty products array
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting vehicle:', insertError);
      return NextResponse.json({ error: 'Failed to insert vehicle' }, { status: 500 });
    }

    return NextResponse.json(newVehicle, { status: 201 });

  } catch (error) {
    console.error('Error in vehicles-ip POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



