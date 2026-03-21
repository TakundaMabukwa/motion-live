import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    const body = await request.json();
    const costCode = String(body?.cost_code || '').trim().toUpperCase();
    const vehicleAction = body?.vehicleAction;

    if (!costCode) {
      return NextResponse.json(
        { error: 'Cost code required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const findVehiclesForCostCode = async () => {
      const [newAccountResult, accountResult] = await Promise.all([
        supabase
          .from('vehicles')
          .select('id')
          .eq('new_account_number', costCode),
        supabase
          .from('vehicles')
          .select('id')
          .eq('account_number', costCode),
      ]);

      if (newAccountResult.error) {
        return { data: null, error: newAccountResult.error };
      }

      if (accountResult.error) {
        return { data: null, error: accountResult.error };
      }

      const byId = new Map();
      [...(newAccountResult.data || []), ...(accountResult.data || [])].forEach((vehicle) => {
        if (vehicle?.id != null) {
          byId.set(vehicle.id, vehicle);
        }
      });

      return { data: Array.from(byId.values()), error: null };
    };

    // Check if there are vehicles with this cost code
    const { data: vehicles, error: vehicleCheckError } = await findVehiclesForCostCode();

    if (vehicleCheckError) {
      console.error('Error checking vehicles:', vehicleCheckError);
      return NextResponse.json(
        { error: 'Failed to check vehicles', details: vehicleCheckError.message },
        { status: 500 }
      );
    }

    // Handle vehicles based on action
    if (vehicles && vehicles.length > 0) {
      const vehicleIds = vehicles
        .map((vehicle) => vehicle?.id)
        .filter((id) => id != null);

      if (vehicleAction === 'delete') {
        // Delete vehicles from the system
        const { error: deleteVehiclesError } = await supabase
          .from('vehicles')
          .delete()
          .in('id', vehicleIds);

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
          .update({ new_account_number: targetCostCode, account_number: targetCostCode })
          .in('id', vehicleIds);

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
      .eq('cost_code', costCode);

    if (deleteCostCenterError) {
      console.error('Error deleting cost center:', deleteCostCenterError);
      return NextResponse.json(
        { error: 'Failed to delete cost center', details: deleteCostCenterError.message },
        { status: 500 }
      );
    }

    const { data: groupedRows, error: groupedFetchError } = await supabase
      .from('customers_grouped')
      .select('id, all_new_account_numbers');

    if (groupedFetchError) {
      console.error('Error fetching grouped customers for cost center delete:', groupedFetchError);
    } else if (Array.isArray(groupedRows)) {
      for (const row of groupedRows) {
        const codes = String(row?.all_new_account_numbers || '')
          .split(',')
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean);

        if (!codes.includes(costCode)) continue;

        const updatedCodes = codes.filter((code) => code !== costCode);
        const { error: groupedUpdateError } = await supabase
          .from('customers_grouped')
          .update({
            all_new_account_numbers: updatedCodes.join(','),
          })
          .eq('id', row.id);

        if (groupedUpdateError) {
          console.error('Error updating grouped customer after cost center delete:', groupedUpdateError);
          return NextResponse.json(
            {
              error: 'Cost center deleted, but failed to update grouped customer accounts',
              details: groupedUpdateError.message,
            },
            { status: 500 },
          );
        }
      }
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
