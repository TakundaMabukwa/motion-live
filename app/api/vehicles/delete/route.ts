import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle ID required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: existingVehicle, error: existingVehicleError } = await supabase
      .from('vehicles_duplicate')
      .select('id, unique_id, reg, fleet_number, new_account_number, account_number')
      .eq('id', id)
      .maybeSingle();

    if (existingVehicleError) {
      console.error('Error finding vehicle before delete:', existingVehicleError);
      return NextResponse.json(
        { error: 'Failed to delete vehicle', details: existingVehicleError.message },
        { status: 500 }
      );
    }

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('vehicles_duplicate')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      return NextResponse.json(
        { error: 'Failed to delete vehicle', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in vehicle delete API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle', details: errMsg },
      { status: 500 }
    );
  }
}
