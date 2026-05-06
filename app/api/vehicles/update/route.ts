import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper functions for billing lock
const BILLABLE_VEHICLE_FIELDS = new Set([
  'skylink_trailer_unit_rental', 'skylink_trailer_sub', 'sky_on_batt_ign_rental', 'sky_on_batt_sub',
  'skylink_voice_kit_rental', 'skylink_voice_kit_sub', 'sky_scout_12v_rental', 'sky_scout_12v_sub',
  'sky_scout_24v_rental', 'sky_scout_24v_sub', 'skylink_pro_rental', 'skylink_pro_sub',
  'skyspy_rental', 'skyspy_sub', 'sky_idata_rental', 'sky_ican_rental', 'industrial_panic_rental',
  'flat_panic_rental', 'buzzer_rental', 'tag_rental', 'tag_reader_rental', 'keypad_rental',
  'early_warning_rental', 'cia_rental', 'fm_unit_rental', 'fm_unit_sub', 'gps_rental', 'gsm_rental',
  'tag_rental_', 'tag_reader_rental_', 'main_fm_harness_rental', 'beame_1_rental', 'beame_1_sub',
  'beame_2_rental', 'beame_2_sub', 'beame_3_rental', 'beame_3_sub', 'beame_4_rental', 'beame_4_sub',
  'beame_5_rental', 'beame_5_sub', 'single_probe_rental', 'single_probe_sub', 'dual_probe_rental',
  'dual_probe_sub', '_7m_harness_for_probe_rental', 'tpiece_rental', 'idata_rental',
  '_1m_extension_cable_rental', '_3m_extension_cable_rental', '_4ch_mdvr_rental', '_4ch_mdvr_sub',
  '_5ch_mdvr_rental', '_5ch_mdvr_sub', '_8ch_mdvr_rental', '_8ch_mdvr_sub', 'a2_dash_cam_rental',
  'a2_dash_cam_sub', 'a3_dash_cam_ai_rental', '_5m_cable_for_camera_4pin_rental',
  '_5m_cable_6pin_rental', '_10m_cable_for_camera_4pin_rental', 'a2_mec_5_rental',
  'vw400_dome_1_rental', 'vw400_dome_2_rental', 'vw300_dakkie_dome_1_rental',
  'vw300_dakkie_dome_2_rental', 'vw502_dual_lens_camera_rental', 'vw303_driver_facing_camera_rental',
  'vw502f_road_facing_camera_rental', 'vw306_dvr_road_facing_for_4ch_8ch_rental',
  'vw306m_a2_dash_cam_rental', 'dms01_driver_facing_rental', 'adas_02_road_facing_rental',
  'vw100ip_driver_facing_rental', 'sd_card_1tb_rental', 'sd_card_2tb_rental', 'sd_card_480gb_rental',
  'sd_card_256gb_rental', 'sd_card_512gb_rental', 'sd_card_250gb_rental', 'mic_rental',
  'speaker_rental', 'pfk_main_unit_rental', 'pfk_main_unit_sub', 'breathaloc_rental',
  'pfk_road_facing_rental', 'pfk_driver_facing_rental', 'pfk_dome_1_rental', 'pfk_dome_2_rental',
  'pfk_5m_rental', 'pfk_10m_rental', 'pfk_15m_rental', 'pfk_20m_rental',
  'roller_door_switches_rental', 'consultancy', 'roaming', 'maintenance', 'after_hours',
  'controlroom', 'eps_software_development', 'maysene_software_development',
  'waterford_software_development', 'klaver_software_development', 'advatrans_software_development',
  'tt_linehaul_software_development', 'tt_express_software_development', 'tt_fmcg_software_development',
  'rapid_freight_software_development', 'remco_freight_software_development',
  'vt_logistics_software_development', 'epilite_software_development', 'total_rental_sub',
  'total_rental', 'total_sub', 'software', 'additional_data'
]);

function findPresentBillableVehicleFields(vehicleData: Record<string, any>) {
  return Object.keys(vehicleData).filter(key => 
    BILLABLE_VEHICLE_FIELDS.has(key) && 
    vehicleData[key] !== null && 
    vehicleData[key] !== undefined && 
    vehicleData[key] !== ''
  );
}

function findTouchedBillableVehicleFields(updateData: Record<string, any>) {
  return Object.keys(updateData).filter(key => BILLABLE_VEHICLE_FIELDS.has(key));
}

async function isBillingLocked(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('system_locks')
    .select('is_locked')
    .eq('lock_key', 'billing')
    .single();
  return data?.is_locked || false;
}

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    const { id, unique_id, ...updateData } = vehicleData;
    const identifier = unique_id || id;
    const identifierField = unique_id ? 'unique_id' : 'id';
    let lookupField = identifierField;
    let lookupValue = identifier;
    const { data: foundVehicle, error: existingVehicleError } = await supabase
      .from('vehicles_duplicate')
      .select('id, unique_id, vehicle_validated')
      .eq(identifierField, identifier)
      .maybeSingle();
    let existingVehicle = foundVehicle;

    if (existingVehicleError) {
      console.error('Error finding existing vehicle before update:', {
        error: existingVehicleError,
        identifier,
        identifierField,
      });
      return NextResponse.json(
        { error: 'Failed to update vehicle', details: existingVehicleError.message },
        { status: 500 }
      );
    }

    if (!existingVehicle) {
      const fallbackReg = String(updateData?.reg || '').trim();
      const fallbackFleetNumber = String(updateData?.fleet_number || '').trim();

      if (fallbackReg || fallbackFleetNumber) {
        let fallbackQuery = supabase
          .from('vehicles_duplicate')
          .select('id, unique_id, vehicle_validated')
          .limit(1);

        if (fallbackReg && fallbackFleetNumber) {
          fallbackQuery = fallbackQuery.or(
            `reg.eq.${fallbackReg.replace(/,/g, '\\,')},fleet_number.eq.${fallbackFleetNumber.replace(/,/g, '\\,')}`
          );
        } else if (fallbackReg) {
          fallbackQuery = fallbackQuery.eq('reg', fallbackReg);
        } else {
          fallbackQuery = fallbackQuery.eq('fleet_number', fallbackFleetNumber);
        }

        const { data: fallbackRows, error: fallbackError } = await fallbackQuery;
        if (fallbackError) {
          console.error('Error finding fallback vehicle before update:', {
            error: fallbackError,
            fallbackReg,
            fallbackFleetNumber,
          });
          return NextResponse.json(
            { error: 'Failed to update vehicle', details: fallbackError.message },
            { status: 500 }
          );
        }

        const fallbackVehicle = Array.isArray(fallbackRows) ? fallbackRows[0] : null;
        if (fallbackVehicle) {
          existingVehicle = fallbackVehicle;
          lookupField = 'id';
          lookupValue = fallbackVehicle.id;
        }
      }

      if (!existingVehicle) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        );
      }
    }

    const billingLocked = await isBillingLocked(supabase);
    const isValidationUpdate =
      existingVehicle.vehicle_validated === true || updateData.vehicle_validated === true;
    const touchedBillableFields = findTouchedBillableVehicleFields(updateData);

    if (touchedBillableFields.length > 0 && billingLocked && !isValidationUpdate) {
      return NextResponse.json(
        {
          error: 'Billing is locked',
          details:
            'Rental, subscription, and billing total fields cannot be changed while the system is locked.',
          fields: touchedBillableFields,
        },
        { status: 423 }
      );
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'amount_locked')) {
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized', details: 'You must be signed in to lock an amount' },
          { status: 401 }
        );
      }

      if (updateData.amount_locked) {
        updateData.amount_locked_by = user.id;
        updateData.amount_locked_at = new Date().toISOString();
      } else {
        updateData.amount_locked_by = null;
        updateData.amount_locked_at = null;
      }
    }

    // Allow UI to submit cost_code; map it to the vehicles_duplicate field new_account_number.
    if (Object.prototype.hasOwnProperty.call(updateData, 'cost_code')) {
      const incomingCostCode = updateData.cost_code;
      if (incomingCostCode !== undefined && incomingCostCode !== null && incomingCostCode !== '') {
        updateData.new_account_number = incomingCostCode;
      }
      delete updateData.cost_code;
    }

    console.log('Updating vehicle:', {
      identifier,
      identifierField,
      lookupField,
      lookupValue,
      hasUpdateData: Object.keys(updateData).length,
    });

    const { data, error } = await supabase
      .from('vehicles_duplicate')
      .update(updateData)
      .eq(lookupField, lookupValue)
      .select();

    if (error) {
      console.error('Error updating vehicle:', {
        error,
        identifier,
        identifierField,
        lookupField,
        lookupValue,
      });
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

    const mirroredUpdateData = {
      ...updateData,
      unique_id: updatedVehicle?.unique_id ?? unique_id ?? null,
      new_account_number: updatedVehicle?.new_account_number ?? updateData?.new_account_number ?? null,
      account_number: updatedVehicle?.account_number ?? updateData?.account_number ?? null,
      company: updatedVehicle?.company ?? updateData?.company ?? null,
      reg: updatedVehicle?.reg ?? updateData?.reg ?? null,
      fleet_number: updatedVehicle?.fleet_number ?? updateData?.fleet_number ?? null,
    };

    if (matchedVehicles.length > 0) {
      const vehicleIds = matchedVehicles
        .map((vehicle) => vehicle.id)
        .filter((vehicleId) => vehicleId !== null && vehicleId !== undefined);

      if (vehicleIds.length > 0) {
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
    } else {
      const insertPayload = Object.fromEntries(
        Object.entries(updatedVehicle || {}).filter(([, value]) => value !== undefined)
      );
      delete insertPayload.id;

      if (!insertPayload.account_number && insertPayload.new_account_number) {
        insertPayload.account_number = insertPayload.new_account_number;
      }

      const presentBillableFields = findPresentBillableVehicleFields(insertPayload);
      if (presentBillableFields.length > 0 && billingLocked && !isValidationUpdate) {
        return NextResponse.json(
          {
            error: 'Billing is locked',
            details:
              'This update would insert billing values into the vehicles table while the system is locked.',
            fields: presentBillableFields,
          },
          { status: 423 }
        );
      }

      const { error: vehiclesInsertError } = await supabase
        .from('vehicles')
        .insert(insertPayload);

      if (vehiclesInsertError) {
        console.error('Error inserting missing vehicle into vehicles table:', vehiclesInsertError);
        return NextResponse.json(
          { error: 'Failed to mirror vehicle insert', details: vehiclesInsertError.message },
          { status: 500 }
        );
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
