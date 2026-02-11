import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const vehicleData = await request.json();
    
    if (!vehicleData.id) {
      return NextResponse.json(
        { error: 'Vehicle ID required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { id, ...updateData } = vehicleData;

    const { data, error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      return NextResponse.json(
        { error: 'Failed to update vehicle', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in vehicle update API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to update vehicle', details: errMsg },
      { status: 500 }
    );
  }
}
