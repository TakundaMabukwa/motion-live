import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    // Fetch all vehicle fields
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .or(`account_number.eq.${accountNumber},new_account_number.eq.${accountNumber}`);

    if (error) throw error;
    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ 
        success: true,
        accountNumber,
        invoiceData: null,
        message: 'No vehicle data found'
      });
    }

    // Fetch customer details
    const { data: customers } = await supabase
      .from('customers')
      .select('legal_name, company, trading_name, new_account_number, account_number')
      .or(`account_number.eq.${accountNumber},new_account_number.eq.${accountNumber}`);

    const customer = customers?.[0];
    const companyName = customer?.legal_name || customer?.company || customer?.trading_name || '';

    // Build invoice items
    const invoiceItems: any[] = [];
    let totalAmount = 0;

    const BILLABLE_COLUMNS = new Set([
      'skylink_trailer_unit_rental',
      'skylink_trailer_sub',
      'sky_on_batt_ign_rental',
      'sky_on_batt_sub',
      'skylink_voice_kit_rental',
      'skylink_voice_kit_sub',
      'sky_scout_12v_rental',
      'sky_scout_12v_sub',
      'sky_scout_24v_rental',
      'sky_scout_24v_sub',
      'skylink_pro_rental',
      'skylink_pro_sub',
      'sky_idata_rental',
      'sky_ican_rental',
      'industrial_panic_rental',
      'flat_panic_rental',
      'buzzer_rental',
      'tag_rental',
      'tag_reader_rental',
      'keypad_rental',
      'early_warning_rental',
      'cia_rental',
      'fm_unit_rental',
      'fm_unit_sub',
      'gps_rental',
      'gsm_rental',
      'tag_rental_',
      'tag_reader_rental_',
      'main_fm_harness_rental',
      'beame_1_rental',
      'beame_1_sub',
      'beame_2_rental',
      'beame_2_sub',
      'beame_3_rental',
      'beame_3_sub',
      'beame_4_rental',
      'beame_4_sub',
      'beame_5_rental',
      'beame_5_sub',
      'single_probe_rental',
      'single_probe_sub',
      'dual_probe_rental',
      'dual_probe_sub',
      '_7m_harness_for_probe_rental',
      'tpiece_rental',
      'idata_rental',
      '_1m_extension_cable_rental',
      '_3m_extension_cable_rental',
      '_4ch_mdvr_rental',
      '_4ch_mdvr_sub',
      '_5ch_mdvr_rental',
      '_5ch_mdvr_sub',
      '_8ch_mdvr_rental',
      '_8ch_mdvr_sub',
      'a2_dash_cam_rental',
      'a2_dash_cam_sub',
      'a3_dash_cam_ai_rental',
      '_5m_cable_for_camera_4pin_rental',
      '_5m_cable_6pin_rental',
      '_10m_cable_for_camera_4pin_rental',
      'a2_mec_5_rental',
      'vw400_dome_1_rental',
      'vw400_dome_2_rental',
      'vw300_dakkie_dome_1_rental',
      'vw300_dakkie_dome_2_rental',
      'vw502_dual_lens_camera_rental',
      'vw303_driver_facing_camera_rental',
      'vw502f_road_facing_camera_rental',
      'vw306_dvr_road_facing_for_4ch_8ch_rental',
      'vw306m_a2_dash_cam_rental',
      'dms01_driver_facing_rental',
      'adas_02_road_facing_rental',
      'vw100ip_driver_facing_rental',
      'sd_card_1tb_rental',
      'sd_card_2tb_rental',
      'sd_card_480gb_rental',
      'sd_card_256gb_rental',
      'sd_card_512gb_rental',
      'sd_card_250gb_rental',
      'mic_rental',
      'speaker_rental',
      'pfk_main_unit_rental',
      'pfk_main_unit_sub',
      'breathaloc_rental',
      'pfk_road_facing_rental',
      'pfk_driver_facing_rental',
      'pfk_dome_1_rental',
      'pfk_dome_2_rental',
      'pfk_5m_rental',
      'pfk_10m_rental',
      'pfk_15m_rental',
      'pfk_20m_rental',
      'roller_door_switches_rental',
      'consultancy',
      'roaming',
      'maintenance',
      'after_hours',
      'controlroom',
      'total_rental_sub',
      'total_rental',
      'total_sub',
      'software',
      'additional_data'
    ]);

    vehicles.forEach((vehicle) => {
      // Show both reg and fleet_number if available
      let regFleetDisplay = '';
      if (vehicle.reg && vehicle.fleet_number) {
        regFleetDisplay = `${vehicle.reg} / ${vehicle.fleet_number}`;
      } else {
        regFleetDisplay = vehicle.reg || vehicle.fleet_number || '';
      }
      
      // Loop through all fields to find billable items
      Object.keys(vehicle).forEach((key) => {
        // Check if it's a rental, sub, or roaming field with a value
        if (BILLABLE_COLUMNS.has(key) && vehicle[key]) {
          const amount = parseFloat(vehicle[key]) || 0;
          if (amount > 0) {
            // Get the base field name (without _rental or _sub)
            const baseFieldName = key.replace(/_rental$/, '').replace(/_sub$/, '');
            
            // Check if the corresponding equipment field is not empty
            const equipmentField = vehicle[baseFieldName];
            const hasEquipment = equipmentField && equipmentField.toString().trim() !== '';
            
            if (hasEquipment || key === 'roaming') {
              const vatAmount = amount * 0.15;
              const totalInclVat = amount + vatAmount;
              
              // Format the field name as item description
              const itemName = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
              
              invoiceItems.push({
                reg: vehicle.reg || null,
                fleetNumber: vehicle.fleet_number || null,
                regFleetDisplay,
                item_code: key.toUpperCase(),
                description: itemName,
                company: vehicle.company || companyName,
                account_number: vehicle.account_number || vehicle.new_account_number || '',
                units: 1,
                unit_price: amount.toFixed(2),
                unit_price_without_vat: amount.toFixed(2),
                amountExcludingVat: amount.toFixed(2),
                total_excl_vat: amount.toFixed(2),
                vat_amount: vatAmount.toFixed(2),
                vatAmount: vatAmount.toFixed(2),
                total_incl_vat: totalInclVat.toFixed(2),
                total_including_vat: totalInclVat.toFixed(2),
                totalRentalSub: totalInclVat.toFixed(2)
              });
              
              totalAmount += totalInclVat;
            }
          }
        }
      });
    });

    // Structure invoice
    const invoiceData = {
      company_name: companyName,
      account_number: accountNumber,
      invoice_date: new Date().toLocaleDateString(),
      invoice_items: invoiceItems,
      invoiceItems: invoiceItems,
      total_amount: totalAmount.toFixed(2)
    };

    return NextResponse.json({
      success: true,
      accountNumber,
      invoiceData,
      message: 'Invoice generated successfully'
    });

  } catch (error) {
    console.error('Error in vehicle invoice API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
