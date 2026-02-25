import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const vehicleData = await request.json();
    if (!vehicleData?.new_account_number) {
      return NextResponse.json(
        { error: 'new_account_number is required' },
        { status: 400 }
      );
    }

    // Normalize common alias before insert.
    const normalizedVehicleData = { ...vehicleData };
    if (normalizedVehicleData.color && !normalizedVehicleData.colour) {
      normalizedVehicleData.colour = normalizedVehicleData.color;
    }
    delete normalizedVehicleData.color;
    
    const supabase = await createClient();

    // Auto-validate vehicles added from FC validation flow.
    // If DB column is missing (migration not applied), retry without this field.
    const insertPayload = { ...normalizedVehicleData, vehicle_validated: true };
    let { data, error } = await supabase
      .from('vehicles_duplicate')
      .insert([insertPayload])
      .select()
      .single();

    if (error && /vehicle_validated/i.test(error.message || '')) {
      const fallbackPayload = { ...insertPayload };
      delete fallbackPayload.vehicle_validated;
      const retryResult = await supabase
        .from('vehicles_duplicate')
        .insert([fallbackPayload])
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

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