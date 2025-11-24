import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicle_id');

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    console.log('Fetching products for vehicle:', vehicleId);

    // Fetch vehicle data from vehicles table
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      console.error('Vehicle not found:', vehicleError);
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Extract installed products from vehicle fields
    const installedProducts = [];
    
    // Define product mappings
    const productMappings = [
      { field: 'skylink_trailer_unit_serial_number', name: 'Skylink Trailer Unit', type: 'FMS', category: 'HARDWARE' },
      { field: 'sky_on_batt_ign_unit_serial_number', name: 'Sky On Batt IGN Unit', type: 'FMS', category: 'HARDWARE' },
      { field: 'skylink_voice_kit_serial_number', name: 'Skylink Voice Kit', type: 'PTT', category: 'PTT RADIOS' },
      { field: 'sky_scout_12v_serial_number', name: 'Sky Scout 12V', type: 'FMS', category: 'HARDWARE' },
      { field: 'sky_scout_24v_serial_number', name: 'Sky Scout 24V', type: 'FMS', category: 'HARDWARE' },
      { field: 'skylink_pro_serial_number', name: 'Skylink Pro', type: 'FMS', category: 'HARDWARE' },
      { field: 'industrial_panic', name: 'Industrial Panic Button', type: 'INPUT', category: 'INPUTS' },
      { field: 'flat_panic', name: 'Flat Panic Button', type: 'INPUT', category: 'INPUTS' },
      { field: 'buzzer', name: 'Buzzer', type: 'MODULE', category: 'MODULES' },
      { field: 'tag', name: 'Tag', type: 'MODULE', category: 'MODULES' },
      { field: 'tag_reader', name: 'Tag Reader', type: 'MODULE', category: 'MODULES' },
      { field: 'keypad', name: 'Keypad', type: 'INPUT', category: 'INPUTS' },
      { field: 'keypad_waterproof', name: 'Keypad Waterproof', type: 'INPUT', category: 'INPUTS' },
      { field: 'early_warning', name: 'Early Warning', type: 'MODULE', category: 'MODULES' },
      { field: '_4ch_mdvr', name: '4CH MDVR', type: 'DVR CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: '_5ch_mdvr', name: '5CH MDVR', type: 'DVR CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: '_8ch_mdvr', name: '8CH MDVR', type: 'DVR CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'a2_dash_cam', name: 'A2 Dash Cam', type: 'DASHCAM', category: 'CAMERA EQUIPMENT' },
      { field: 'a3_dash_cam_ai', name: 'A3 Dash Cam AI', type: 'DASHCAM', category: 'AI MOVEMENT DETECTION' },
      { field: 'vw400_dome_1', name: 'VW400 Dome Camera 1', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'vw400_dome_2', name: 'VW400 Dome Camera 2', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'vw300_dakkie_dome_1', name: 'VW300 Dakkie Dome 1', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'vw300_dakkie_dome_2', name: 'VW300 Dakkie Dome 2', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'vw502_dual_lens_camera', name: 'VW502 Dual Lens Camera', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'vw303_driver_facing_camera', name: 'VW303 Driver Facing Camera', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'vw502f_road_facing_camera', name: 'VW502F Road Facing Camera', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'pfk_main_unit', name: 'PFK Main Unit', type: 'FMS', category: 'HARDWARE' },
      { field: 'breathaloc', name: 'Breathaloc', type: 'MODULE', category: 'MODULES' },
      { field: 'pfk_road_facing', name: 'PFK Road Facing Camera', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'pfk_driver_facing', name: 'PFK Driver Facing Camera', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'pfk_dome_1', name: 'PFK Dome Camera 1', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' },
      { field: 'pfk_dome_2', name: 'PFK Dome Camera 2', type: 'PFK CAMERA', category: 'CAMERA EQUIPMENT' }
    ];

    // Check each product field and add to installed products if not empty
    productMappings.forEach((mapping, index) => {
      const fieldValue = vehicle[mapping.field];
      if (fieldValue && fieldValue.trim() !== '') {
        installedProducts.push({
          id: `${vehicleId}-${mapping.field}`,
          name: mapping.name,
          description: `${mapping.name} - Serial: ${fieldValue}`,
          type: mapping.type,
          category: mapping.category,
          serial_number: fieldValue,
          de_installation_price: 500, // Default de-installation price
          vehicleId: vehicleId,
          vehiclePlate: vehicle.reg || vehicle.fleet_number || 'Unknown'
        });
      }
    });

    console.log(`Found ${installedProducts.length} installed products for vehicle ${vehicleId}`);

    return NextResponse.json({ 
      products: installedProducts,
      vehicle_id: vehicleId,
      vehicle_info: {
        reg: vehicle.reg,
        fleet_number: vehicle.fleet_number,
        make: vehicle.make,
        model: vehicle.model
      }
    });

  } catch (error) {
    console.error('Error in vehicle products GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
