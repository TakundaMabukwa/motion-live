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
    const registration = searchParams.get('registration');

    if (!registration) {
      return NextResponse.json({ 
        error: 'Registration is required' 
      }, { status: 400 });
    }

    // Fetch vehicle details
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('*')
      .or(`reg.eq.${registration},fleet_number.eq.${registration}`)
      .single();

    if (error || !vehicle) {
      return NextResponse.json({ 
        error: 'Vehicle not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      vehicle
    });

  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}