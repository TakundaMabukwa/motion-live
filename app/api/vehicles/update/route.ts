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

    // Allow UI to submit cost_code; map it to the vehicles_duplicate field new_account_number.
    if (Object.prototype.hasOwnProperty.call(updateData, 'cost_code')) {
      const incomingCostCode = updateData.cost_code;
      if (incomingCostCode !== undefined && incomingCostCode !== null && incomingCostCode !== '') {
        updateData.new_account_number = incomingCostCode;
      }
      delete updateData.cost_code;
    }

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

    const updatedVehicle = data[0];
    const reg = String(updatedVehicle?.reg || '').trim();
    const fleetNumber = String(updatedVehicle?.fleet_number || '').trim();
    const updatedUniqueId = updatedVehicle?.unique_id || unique_id || null;

    let matchedVehicles = [];

    if (updatedUniqueId) {
      const { data: vehiclesByUniqueId, error: vehiclesByUniqueIdError } = await supabase
        .from('vehicles')
        .select('id, unique_id, reg, fleet_number')
        .eq('unique_id', updatedUniqueId);

      if (vehiclesByUniqueIdError) {
        console.error('Error finding vehicles by unique_id:', vehiclesByUniqueIdError);
        return NextResponse.json(
          { error: 'Failed to update vehicle', details: vehiclesByUniqueIdError.message },
          { status: 500 }
        );
      }

      matchedVehicles = vehiclesByUniqueId || [];
    }

    if (matchedVehicles.length === 0 && (reg || fleetNumber)) {
      let vehiclesQuery = supabase
        .from('vehicles')
        .select('id, unique_id, reg, fleet_number');

      if (reg && fleetNumber) {
        vehiclesQuery = vehiclesQuery.or(
          `reg.eq.${reg.replace(/,/g, '\\,')},fleet_number.eq.${fleetNumber.replace(/,/g, '\\,')}`
        );
      } else if (reg) {
        vehiclesQuery = vehiclesQuery.eq('reg', reg);
      } else {
        vehiclesQuery = vehiclesQuery.eq('fleet_number', fleetNumber);
      }

      const { data: vehiclesByIdentifier, error: vehiclesByIdentifierError } = await vehiclesQuery;

      if (vehiclesByIdentifierError) {
        console.error('Error finding vehicles by reg/fleet:', vehiclesByIdentifierError);
        return NextResponse.json(
          { error: 'Failed to update vehicle', details: vehiclesByIdentifierError.message },
          { status: 500 }
        );
      }

      matchedVehicles = vehiclesByIdentifier || [];
    }

    if (matchedVehicles.length > 0) {
      const vehicleIds = matchedVehicles
        .map((vehicle) => vehicle.id)
        .filter((vehicleId) => vehicleId !== null && vehicleId !== undefined);

      if (vehicleIds.length > 0) {
        const mirroredUpdateData = {
          ...updateData,
          new_account_number: updatedVehicle?.new_account_number ?? updateData?.new_account_number,
          account_number: updatedVehicle?.account_number ?? updateData?.account_number,
          company: updatedVehicle?.company ?? updateData?.company,
        };

        const { error: vehiclesUpdateError } = await supabase
          .from('vehicles')
          .update(mirroredUpdateData)
          .in('id', vehicleIds);

        if (vehiclesUpdateError) {
          console.error('Error updating vehicles table:', vehiclesUpdateError);
          return NextResponse.json(
            { error: 'Failed to mirror vehicle update', details: vehiclesUpdateError.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error('Error in vehicle update API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to update vehicle', details: errMsg },
      { status: 500 }
    );
  }
}
