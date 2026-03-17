import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { cost_code, vehicleAction } = body;

    if (!cost_code) {
      return NextResponse.json(
        { error: 'Cost code required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if there are vehicles with this cost code
    const { data: vehicles, error: vehicleCheckError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('new_account_number', cost_code);

    if (vehicleCheckError) {
      console.error('Error checking vehicles:', vehicleCheckError);
      return NextResponse.json(
        { error: 'Failed to check vehicles', details: vehicleCheckError.message },
        { status: 500 }
      );
    }

    // Handle vehicles based on action
    if (vehicles && vehicles.length > 0) {
      if (vehicleAction === 'delete') {
        // Delete vehicles from the system
        const { error: deleteVehiclesError } = await supabase
          .from('vehicles')
          .delete()
          .eq('new_account_number', cost_code);

        if (deleteVehiclesError) {
          console.error('Error deleting vehicles:', deleteVehiclesError);
          return NextResponse.json(
            { error: 'Failed to delete vehicles', details: deleteVehiclesError.message },
            { status: 500 }
          );
        }
      } else if (vehicleAction && vehicleAction !== 'none' && vehicleAction !== 'delete') {
        // Transfer vehicles to another cost center
        const targetCostCode = vehicleAction;
        
        const { error: updateVehiclesError } = await supabase
          .from('vehicles')
          .update({ new_account_number: targetCostCode })
          .eq('new_account_number', cost_code);

        if (updateVehiclesError) {
          console.error('Error transferring vehicles:', updateVehiclesError);
          return NextResponse.json(
            { error: 'Failed to transfer vehicles', details: updateVehiclesError.message },
            { status: 500 }
          );
        }
      }
      // If vehicleAction is 'none', we just don't do anything with the vehicles
    }

    // Delete the cost center
    const { error: deleteCostCenterError } = await supabase
      .from('cost_centers')
      .delete()
      .eq('cost_code', cost_code);

    if (deleteCostCenterError) {
      console.error('Error deleting cost center:', deleteCostCenterError);
      return NextResponse.json(
        { error: 'Failed to delete cost center', details: deleteCostCenterError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cost center deleted successfully',
      vehiclesHandled: vehicles?.length || 0,
      action: vehicleAction
    });
  } catch (error) {
    console.error('Error in cost center delete API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to delete cost center', details: errMsg },
      { status: 500 }
    );
  }
}
