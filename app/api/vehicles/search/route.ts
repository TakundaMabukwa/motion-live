import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vin = searchParams.get('vin');

    if (!vin) {
      return NextResponse.json(
        { error: 'VIN parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Search for vehicle by VIN number
    const { data: vehicle, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('vin_number', vin.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json({ vehicle: null, message: 'Vehicle not found' });
      }
      throw error;
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error('Error searching for vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to search for vehicle' },
      { status: 500 }
    );
  }
}
