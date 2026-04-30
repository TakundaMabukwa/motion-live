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

function findPresentBillableVehicleFields(vehicleData: Record<string, unknown>) {
  return Object.keys(vehicleData).filter(key => 
    BILLABLE_VEHICLE_FIELDS.has(key) && 
    vehicleData[key] !== null && 
    vehicleData[key] !== undefined && 
    vehicleData[key] !== ''
  );
}

async function isBillingLocked(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('system_locks')
    .select('is_locked')
    .eq('lock_key', 'billing')
    .single();
  return data?.is_locked || false;
}

const buildMirroredVehiclePayload = (
  insertedVehicle: Record<string, unknown> | null | undefined,
  sourcePayload: Record<string, unknown>,
) => {
  const payload = {
    ...sourcePayload,
    unique_id: insertedVehicle?.unique_id ?? sourcePayload?.unique_id ?? null,
    new_account_number:
      insertedVehicle?.new_account_number ?? sourcePayload?.new_account_number ?? null,
    account_number:
      insertedVehicle?.account_number ?? sourcePayload?.account_number ?? null,
    company: insertedVehicle?.company ?? sourcePayload?.company ?? null,
    reg: insertedVehicle?.reg ?? sourcePayload?.reg ?? null,
    fleet_number:
      insertedVehicle?.fleet_number ?? sourcePayload?.fleet_number ?? null,
  };

  if (!payload.account_number && payload.new_account_number) {
    payload.account_number = payload.new_account_number;
  }

  delete payload.id;
  delete payload.vehicle_validated;
  delete payload.color;

  return payload;
};

const findVehiclesMatches = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    uniqueId,
    reg,
    fleetNumber,
  }: {
    uniqueId: string;
    reg: string;
    fleetNumber: string;
  },
) => {
  let matchedVehicles: Array<Record<string, unknown>> = [];

  if (uniqueId) {
    const { data: vehiclesByUniqueId, error: vehiclesByUniqueIdError } =
      await supabase
        .from('vehicles')
        .select('id, unique_id, reg, fleet_number')
        .eq('unique_id', uniqueId);

    if (vehiclesByUniqueIdError) {
      throw vehiclesByUniqueIdError;
    }

    matchedVehicles = vehiclesByUniqueId || [];
  }

  if (matchedVehicles.length === 0 && (reg || fleetNumber)) {
    let vehiclesQuery = supabase
      .from('vehicles')
      .select('id, unique_id, reg, fleet_number');

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

    matchedVehicles = vehiclesByIdentifier || [];
  }

  return matchedVehicles;
};

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
    const touchedBillableFields = findPresentBillableVehicleFields(normalizedVehicleData);
    const isValidationInsert = normalizedVehicleData.vehicle_validated === true;
    const billingLocked = await isBillingLocked(supabase);

    if (touchedBillableFields.length > 0 && billingLocked && !isValidationInsert) {
      return NextResponse.json(
        {
          error: 'Billing is locked',
          details:
            'Vehicles can still be created while locked, but rental, subscription, and billing total fields cannot be inserted.',
          fields: touchedBillableFields,
        },
        { status: 423 }
      );
    }

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

    const uniqueId = String(data?.unique_id || '').trim();
    const reg = String(data?.reg || '').trim();
    const fleetNumber = String(data?.fleet_number || '').trim();
    const mirroredPayload = buildMirroredVehiclePayload(data, normalizedVehicleData);

    try {
      const matchedVehicles = await findVehiclesMatches(supabase, {
        uniqueId,
        reg,
        fleetNumber,
      });

      if (matchedVehicles.length > 0) {
        const vehicleIds = matchedVehicles
          .map((vehicle) => vehicle.id)
          .filter((vehicleId) => vehicleId !== null && vehicleId !== undefined);

        if (vehicleIds.length > 0) {
          const { error: vehiclesUpdateError } = await supabase
            .from('vehicles')
            .update(mirroredPayload)
            .in('id', vehicleIds);

          if (vehiclesUpdateError) {
            throw vehiclesUpdateError;
          }
        }
      } else {
        const { error: vehiclesInsertError } = await supabase
          .from('vehicles')
          .insert(mirroredPayload);

        if (vehiclesInsertError) {
          throw vehiclesInsertError;
        }
      }
    } catch (mirrorError) {
      console.error('Error mirroring created vehicle to vehicles table:', mirrorError);
      const details =
        mirrorError instanceof Error ? mirrorError.message : String(mirrorError);
      return NextResponse.json(
        { error: 'Failed to mirror vehicle create', details },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...data,
      billing_fields_stripped: [],
    });
  } catch (error) {
    console.error('Error in vehicle create API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create vehicle', details: errMsg },
      { status: 500 }
    );
  }
}
