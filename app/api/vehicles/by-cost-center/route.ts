import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const costCenter = searchParams.get('cost_center');

    if (!costCenter) {
      return NextResponse.json({ error: 'cost_center parameter is required' }, { status: 400 });
    }

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('reg, make, model, year, fleet_number')
      .eq('new_account_number', costCenter)
      .order('reg');

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      vehicles: vehicles || []
    });

  } catch (error) {
    console.error('Error in vehicles by cost center GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}