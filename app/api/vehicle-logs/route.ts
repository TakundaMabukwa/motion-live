import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Temporarily disable authentication for testing
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { vehicle_registration, status, cost_center, driver_name } = body;

    if (!vehicle_registration || !status) {
      return NextResponse.json({ 
        error: 'Vehicle registration and status are required' 
      }, { status: 400 });
    }

    // Insert new vehicle log
    const { data, error } = await supabase
      .from('vehicle_logs')
      .insert({
        vehicle_registration,
        status,
        cost_center: cost_center || null,
        driver_name: driver_name || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting vehicle log:', error);
      return NextResponse.json({ 
        error: 'Failed to create vehicle log' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      log: data
    });

  } catch (error) {
    console.error('Error in vehicle logs POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Temporarily disable authentication for testing
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const vehicle_registration = searchParams.get('vehicle_registration');

    let query = supabase
      .from('vehicle_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (vehicle_registration) {
      query = query.eq('vehicle_registration', vehicle_registration);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching vehicle logs:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch vehicle logs' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logs: logs || []
    });

  } catch (error) {
    console.error('Error in vehicle logs GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
