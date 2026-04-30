import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const findVehiclesMatchesForDelete = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    uniqueId,
    reg,
    fleetNumber,
    newAccountNumber,
    accountNumber,
  }: {
    uniqueId: string;
    reg: string;
    fleetNumber: string;
    newAccountNumber: string;
    accountNumber: string;
  },
) => {
  let matchedVehicles: Array<Record<string, unknown>> = [];

  if (uniqueId) {
    const { data: vehiclesByUniqueId, error: vehiclesByUniqueIdError } =
      await supabase
        .from('vehicles')
        .select('id, unique_id, reg, fleet_number, new_account_number, account_number')
        .eq('unique_id', uniqueId);

    if (vehiclesByUniqueIdError) {
      throw vehiclesByUniqueIdError;
    }

    matchedVehicles = vehiclesByUniqueId || [];
  }

  if (matchedVehicles.length === 0 && (reg || fleetNumber)) {
    let vehiclesQuery = supabase
      .from('vehicles')
      .select('id, unique_id, reg, fleet_number, new_account_number, account_number');

    if (reg && fleetNumber) {
      vehiclesQuery = vehiclesQuery.or(
        `reg.eq.${reg.replace(/,/g, '\\,')},fleet_number.eq.${fleetNumber.replace(/,/g, '\\,')}`,
      );
    } else if (reg) {
      vehiclesQuery = vehiclesQuery.eq('reg', reg);
    } else {
      vehiclesQuery = vehiclesQuery.eq('fleet_number', fleetNumber);
    }

    const { data: vehiclesByIdentifier, error: vehiclesByIdentifierError } =
      await vehiclesQuery;

    if (vehiclesByIdentifierError) {
      throw vehiclesByIdentifierError;
    }

    const accountCandidates = new Set(
      [newAccountNumber, accountNumber]
        .map((value) => String(value || '').trim().toUpperCase())
        .filter(Boolean),
    );

    if (accountCandidates.size > 0) {
      matchedVehicles = (vehiclesByIdentifier || []).filter((vehicle) => {
        const rowAccountCandidates = [
          vehicle?.new_account_number,
          vehicle?.account_number,
        ]
          .map((value) => String(value || '').trim().toUpperCase())
          .filter(Boolean);
        return rowAccountCandidates.some((value) => accountCandidates.has(value));
      });
    } else {
      matchedVehicles = vehiclesByIdentifier || [];
    }
  }

  return matchedVehicles;
};

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

    const uniqueId = String(existingVehicle?.unique_id || '').trim();
    const reg = String(existingVehicle?.reg || '').trim();
    const fleetNumber = String(existingVehicle?.fleet_number || '').trim();
    const newAccountNumber = String(existingVehicle?.new_account_number || '').trim();
    const accountNumber = String(existingVehicle?.account_number || '').trim();

    try {
      const matchedVehicles = await findVehiclesMatchesForDelete(supabase, {
        uniqueId,
        reg,
        fleetNumber,
        newAccountNumber,
        accountNumber,
      });

      const vehicleIds = matchedVehicles
        .map((vehicle) => vehicle.id)
        .filter((vehicleId) => vehicleId !== null && vehicleId !== undefined);

      if (vehicleIds.length > 0) {
        const { error: vehiclesDeleteError } = await supabase
          .from('vehicles')
          .delete()
          .in('id', vehicleIds);

        if (vehiclesDeleteError) {
          throw vehiclesDeleteError;
        }
      }
    } catch (mirrorError) {
      console.error('Error mirroring vehicle delete to vehicles table:', mirrorError);
      const details =
        mirrorError instanceof Error ? mirrorError.message : String(mirrorError);
      return NextResponse.json(
        { error: 'Failed to mirror vehicle delete', details },
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
