import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BILLABLE_COLUMNS = [
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
];

const BILLABLE_SET = new Set(BILLABLE_COLUMNS);

const toColumnKey = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const getItemAmount = (item: any) => {
  const candidates = [
    item?.subscription_price,
    item?.rental_price,
    item?.cash_price,
    item?.total_price
  ];
  for (const value of candidates) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
};

const pickBillingColumn = (item: any) => {
  const nameKey = item?.name ? toColumnKey(String(item.name)) : '';
  const itemCodeKey = item?.item_code ? toColumnKey(String(item.item_code)) : '';
  const typeKey = item?.type ? toColumnKey(String(item.type)) : '';

  const amount = getItemAmount(item);
  const preferSub = Number(item?.subscription_price || 0) > 0 || String(item?.purchase_type || '').toLowerCase() === 'subscription';
  const preferRental = Number(item?.rental_price || 0) > 0 || String(item?.purchase_type || '').toLowerCase() === 'rental';

  const candidates = [nameKey, itemCodeKey, typeKey].filter(Boolean);

  for (const base of candidates) {
    if (BILLABLE_SET.has(base)) return base;
    if (preferSub && BILLABLE_SET.has(`${base}_sub`)) return `${base}_sub`;
    if (preferRental && BILLABLE_SET.has(`${base}_rental`)) return `${base}_rental`;
  }

  // If nothing matched but amount exists, do not guess.
  return amount > 0 ? null : null;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const costCode = (body?.cost_code || '').toString().trim();
    const quotationProducts = Array.isArray(body?.quotation_products) ? body.quotation_products : [];
    const fallbackReg = (body?.vehicle_registration || '').toString().trim();
    const customerName = body?.customer_name || null;
    const vehicleMake = body?.vehicle_make || null;
    const vehicleModel = body?.vehicle_model || null;
    const vehicleYear = body?.vehicle_year || null;

    if (!costCode) {
      return NextResponse.json({ error: 'cost_code is required' }, { status: 400 });
    }

    if (quotationProducts.length === 0) {
      return NextResponse.json({ success: true, message: 'No quotation products provided', created: 0, updated: 0, skipped: 0 });
    }

    const updatesByReg = new Map<string, Record<string, number>>();
    const skipped: any[] = [];

    for (const item of quotationProducts) {
      const amount = getItemAmount(item);
      if (amount <= 0) {
        skipped.push({ reason: 'no_amount', item });
        continue;
      }

      const column = pickBillingColumn(item);
      if (!column) {
        skipped.push({ reason: 'no_column_match', item });
        continue;
      }

      const reg = (item?.vehicle_plate || fallbackReg || '').toString().trim();
      if (!reg) {
        skipped.push({ reason: 'no_reg', item });
        continue;
      }

      if (!updatesByReg.has(reg)) {
        updatesByReg.set(reg, {});
      }
      const bucket = updatesByReg.get(reg)!;
      bucket[column] = (bucket[column] || 0) + amount;
    }

    let created = 0;
    let updated = 0;

    const selectColumns = ['id', 'reg', 'fleet_number', 'new_account_number', 'account_number', ...BILLABLE_COLUMNS].join(', ');

    for (const [reg, columnUpdates] of updatesByReg.entries()) {
      const { data: existing, error: findError } = await supabase
        .from('vehicles')
        .select(selectColumns)
        .ilike('reg', reg)
        .maybeSingle();

      if (findError) {
        return NextResponse.json({ error: 'Failed to check vehicles', details: findError.message }, { status: 500 });
      }

      if (!existing) {
        const insertData: Record<string, any> = {
          reg,
          company: customerName,
          new_account_number: costCode,
          account_number: costCode,
          make: vehicleMake,
          model: vehicleModel,
          year: vehicleYear
        };

        for (const [column, value] of Object.entries(columnUpdates)) {
          insertData[column] = value;
        }

        const { error: insertError } = await supabase
          .from('vehicles')
          .insert(insertData);

        if (insertError) {
          return NextResponse.json({ error: 'Failed to insert vehicle billing', details: insertError.message }, { status: 500 });
        }

        created += 1;
        continue;
      }

      const updateData: Record<string, any> = {};
      if (!existing.new_account_number) {
        updateData.new_account_number = costCode;
      }
      if (!existing.account_number) {
        updateData.account_number = costCode;
      }
      for (const [column, value] of Object.entries(columnUpdates)) {
        const current = Number(existing[column] || 0);
        updateData[column] = current + value;
      }

      const { error: updateError } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', existing.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update vehicle billing', details: updateError.message }, { status: 500 });
      }

      updated += 1;
    }

    return NextResponse.json({ success: true, cost_code: costCode, created, updated, skipped });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message || 'Unknown error' }, { status: 500 });
  }
}
