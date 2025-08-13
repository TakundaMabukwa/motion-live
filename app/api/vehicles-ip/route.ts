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
    if (!body.new_registration || !body.new_account_number || !body.ip_address) {
      return NextResponse.json({ 
        error: 'Missing required fields: new_registration, new_account_number, and ip_address are required' 
      }, { status: 400 });
    }

    // Prepare vehicle data
    const vehicleData = {
      new_registration: body.new_registration,
      new_account_number: body.new_account_number,
      ip_address: body.ip_address,
      vin_number: body.vin_number || null,
      company: body.company || body.new_account_number,
      products: body.products || [],
      active: body.active !== undefined ? body.active : true,
      comment: body.comment || null,
      group_name: body.group_name || null,
      beame_1: body.beame_1 || null,
      beame_2: body.beame_2 || null,
      beame_3: body.beame_3 || null
    };

    // Insert into vehicles_ip table
    const { data, error } = await supabase
      .from('vehicles_ip')
      .insert(vehicleData)
      .select()
      .single();

    if (error) {
      console.error('Error adding vehicle to vehicles_ip:', error);
      return NextResponse.json({ error: 'Failed to add vehicle to vehicles_ip' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vehicle: data,
      message: 'Vehicle added to vehicles_ip successfully'
    });

  } catch (error) {
    console.error('Error in vehicles-ip POST:', error);
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

    // Get search parameters
    const { searchParams } = new URL(request.url);
    const registration = searchParams.get('registration');
    const accountNumber = searchParams.get('accountNumber');

    let query = supabase
      .from('vehicles_ip')
      .select('*')
      .order('id', { ascending: false });

    // Apply filters if provided
    if (registration) {
      query = query.ilike('new_registration', `%${registration}%`);
    }
    if (accountNumber) {
      query = query.ilike('new_account_number', `%${accountNumber}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles_ip:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    return NextResponse.json({
      vehicles: data || [],
      total: (data || []).length
    });

  } catch (error) {
    console.error('Error in vehicles-ip GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



