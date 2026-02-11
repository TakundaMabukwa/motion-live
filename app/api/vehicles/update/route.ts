import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const vehicleData = await request.json();
    
    if (!vehicleData.id && !vehicleData.unique_id) {
      return NextResponse.json(
        { error: 'Vehicle id or unique_id required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { id, unique_id, ...updateData } = vehicleData;
    const identifier = unique_id || id;
    const identifierField = unique_id ? 'unique_id' : 'id';

    console.log('Updating vehicle:', { identifier, identifierField, hasUpdateData: Object.keys(updateData).length });

    const { data, error } = await supabase
      .from('vehicles_duplicate')
      .update(updateData)
      .eq(identifierField, identifier)
      .select();

    if (error) {
      console.error('Error updating vehicle:', { error, identifier, identifierField });
      return NextResponse.json(
        { error: 'Failed to update vehicle', details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Error in vehicle update API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to update vehicle', details: errMsg },
      { status: 500 }
    );
  }
}
