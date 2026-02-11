import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const vehicleData = await request.json();
    
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vehicles')
      .insert([vehicleData])
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      return NextResponse.json(
        { error: 'Failed to create vehicle', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in vehicle create API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create vehicle', details: errMsg },
      { status: 500 }
    );
  }
}
