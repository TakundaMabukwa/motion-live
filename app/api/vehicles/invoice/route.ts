import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeBillingMonth } from '@/lib/server/account-invoice-payments';

const buildAddress = (source?: Record<string, unknown> | null) =>
  [
    source?.physical_address_1,
    source?.physical_address_2,
    source?.physical_address_3,
    source?.physical_area,
    source?.physical_province,
    source?.physical_code,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('\n');

const TOTAL_BILLING_COLUMNS = new Set([
  'total_rental_sub',
  'total_rental',
  'total_sub',
]);

const SERVICE_ONLY_COLUMNS = new Set([
  'consultancy',
  'roaming',
  'maintenance',
  'after_hours',
  'controlroom',
  'software',
  'eps_software_development',
  'maysene_software_development',
  'waterford_software_development',
  'klaver_software_development',
  'advatrans_software_development',
  'tt_linehaul_software_development',
  'tt_express_software_development',
  'tt_fmcg_software_development',
  'rapid_freight_software_development',
  'remco_freight_software_development',
  'vt_logistics_software_development',
  'epilite_software_development',
  'additional_data',
]);

const formatColumnLabel = (value: string) =>
  value
    .replace(/^_+/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const BILLING_COLUMN_LABELS: Record<string, string> = {
  skylink_trailer_unit_rental: 'Skylink Trailer Unit Rental',
  skylink_trailer_sub: 'Skylink Trailer Unit Subscription',
  sky_on_batt_ign_rental: 'Sky On Batt Ign Rental',
  sky_on_batt_sub: 'Sky On Batt Ign Subscription',
  skylink_voice_kit_rental: 'Skylink Voice Kit Rental',
  skylink_voice_kit_sub: 'Skylink Voice Kit Subscription',
  sky_scout_12v_rental: 'Sky Scout 12V Rental',
  sky_scout_12v_sub: 'Sky Scout 12V Subscription',
  sky_scout_24v_rental: 'Sky Scout 24V Rental',
  sky_scout_24v_sub: 'Sky Scout 24V Subscription',
  skylink_pro_rental: 'Skylink Pro Rental',
  skylink_pro_sub: 'Skylink Pro Subscription',
  skyspy_rental: 'SkySpy Rental',
  skyspy_sub: 'SkySpy Subscription',
  sky_idata_rental: 'Sky IData Rental',
  sky_ican_rental: 'Sky ICan Rental',
  industrial_panic_rental: 'Industrial Panic Rental',
  flat_panic_rental: 'Flat Panic Rental',
  buzzer_rental: 'Buzzer Rental',
  tag_rental: 'Tag Rental',
  tag_reader_rental: 'Tag Reader Rental',
  keypad_rental: 'Keypad Rental',
  early_warning_rental: 'Early Warning Rental',
  cia_rental: 'CIA Rental',
  fm_unit_rental: 'FM Unit Rental',
  fm_unit_sub: 'FM Unit Subscription',
  gps_rental: 'GPS Rental',
  gsm_rental: 'GSM Rental',
  tag_rental_: 'Tag Rental',
  tag_reader_rental_: 'Tag Reader Rental',
  main_fm_harness_rental: 'Main FM Harness Rental',
  beame_1_rental: 'Beame Rental',
  beame_1_sub: 'Beame Subscription',
  beame_2_rental: 'Beame Rental',
  beame_2_sub: 'Beame Subscription',
  beame_3_rental: 'Beame Rental',
  beame_3_sub: 'Beame Subscription',
  beame_4_rental: 'Beame Rental',
  beame_4_sub: 'Beame Subscription',
  beame_5_rental: 'Beame Rental',
  beame_5_sub: 'Beame Subscription',
  single_probe_rental: 'Single Probe Rental',
  single_probe_sub: 'Single Probe Subscription',
  dual_probe_rental: 'Dual Probe Rental',
  dual_probe_sub: 'Dual Probe Subscription',
  _7m_harness_for_probe_rental: '7M Harness For Probe Rental',
  tpiece_rental: 'T-Piece Rental',
  idata_rental: 'IData Rental',
  _1m_extension_cable_rental: '1M Extension Cable Rental',
  _3m_extension_cable_rental: '3M Extension Cable Rental',
  _4ch_mdvr_rental: '4CH MDVR Rental',
  _4ch_mdvr_sub: '4CH MDVR Subscription',
  _5ch_mdvr_rental: '5CH MDVR Rental',
  _5ch_mdvr_sub: '5CH MDVR Subscription',
  _8ch_mdvr_rental: '8CH MDVR Rental',
  _8ch_mdvr_sub: '8CH MDVR Subscription',
  a2_dash_cam_rental: 'A2 Dash Cam Rental',
  a2_dash_cam_sub: 'A2 Dash Cam Subscription',
  a3_dash_cam_ai_rental: 'A3 Dash Cam AI Rental',
  _5m_cable_for_camera_4pin_rental: '5M Camera Cable 4 Pin Rental',
  _5m_cable_6pin_rental: '5M Cable 6 Pin Rental',
  _10m_cable_for_camera_4pin_rental: '10M Camera Cable 4 Pin Rental',
  a2_mec_5_rental: 'A2 MEC 5 Rental',
  vw400_dome_1_rental: 'VW400 Dome Rental',
  vw400_dome_2_rental: 'VW400 Dome Rental',
  vw300_dakkie_dome_1_rental: 'VW300 Dakkie Dome Rental',
  vw300_dakkie_dome_2_rental: 'VW300 Dakkie Dome Rental',
  vw502_dual_lens_camera_rental: 'VW502 Dual Lens Camera Rental',
  vw303_driver_facing_camera_rental: 'VW303 Driver Facing Camera Rental',
  vw502f_road_facing_camera_rental: 'VW502F Road Facing Camera Rental',
  vw306_dvr_road_facing_for_4ch_8ch_rental: 'VW306 DVR Road Facing Rental',
  vw306m_a2_dash_cam_rental: 'VW306M A2 Dash Cam Rental',
  dms01_driver_facing_rental: 'DMS01 Driver Facing Rental',
  adas_02_road_facing_rental: 'ADAS 02 Road Facing Rental',
  vw100ip_driver_facing_rental: 'VW100IP Driver Facing Rental',
  sd_card_1tb_rental: 'SD Card 1TB Rental',
  sd_card_2tb_rental: 'SD Card 2TB Rental',
  sd_card_480gb_rental: 'SD Card 480GB Rental',
  sd_card_256gb_rental: 'SD Card 256GB Rental',
  sd_card_512gb_rental: 'SD Card 512GB Rental',
  sd_card_250gb_rental: 'SD Card 250GB Rental',
  mic_rental: 'Mic Rental',
  speaker_rental: 'Speaker Rental',
  pfk_main_unit_rental: 'PFK Main Unit Rental',
  pfk_main_unit_sub: 'PFK Main Unit Subscription',
  breathaloc_rental: 'Breathaloc Rental',
  pfk_road_facing_rental: 'PFK Road Facing Rental',
  pfk_driver_facing_rental: 'PFK Driver Facing Rental',
  pfk_dome_1_rental: 'PFK Dome Rental',
  pfk_dome_2_rental: 'PFK Dome Rental',
  pfk_5m_rental: 'PFK 5M Rental',
  pfk_10m_rental: 'PFK 10M Rental',
  pfk_15m_rental: 'PFK 15M Rental',
  pfk_20m_rental: 'PFK 20M Rental',
  roller_door_switches_rental: 'Roller Door Switches Rental',
  consultancy: 'Consultancy',
  roaming: 'Roaming',
  maintenance: 'Maintenance',
  after_hours: 'After Hours',
  controlroom: 'Control Room',
  software: 'Software',
  additional_data: 'Additional Data',
  eps_software_development: 'EPS Software Development',
  maysene_software_development: 'Maysene Software Development',
  waterford_software_development: 'Waterford Software Development',
  klaver_software_development: 'Klaver Software Development',
  advatrans_software_development: 'Advatrans Software Development',
  tt_linehaul_software_development: 'TT Linehaul Software Development',
  tt_express_software_development: 'TT Express Software Development',
  tt_fmcg_software_development: 'TT FMCG Software Development',
  rapid_freight_software_development: 'Rapid Freight Software Development',
  remco_freight_software_development: 'Remco Freight Software Development',
  vt_logistics_software_development: 'VT Logistics Software Development',
  epilite_software_development: 'Epilite Software Development',
  mtx_mc202x_rental: 'MTX MC202X Rental',
  mtx_mc202x_sub: 'MTX MC202X Subscription',
  driver_app: 'Driver App',
};

const normalizeBillingLabel = (value: string) =>
  BILLING_COLUMN_LABELS[value] ||
  formatColumnLabel(value)
    .replace(/\bSub\b/gi, 'Subscription')
    .replace(/\bRental\b/gi, 'Rental');

const toAmount = (value: unknown) => {
  const amount = Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(amount) ? amount : 0;
};

const hasLegacyStoredLineItems = (items: any[]) =>
  items.some((item) => {
    const itemCode = String(item?.item_code || '').trim().toUpperCase();
    const description = String(item?.description || '').trim().toUpperCase();
    return (
      itemCode === 'CURRENT-BILLING' ||
      description === 'CURRENT VEHICLE BILLING DRAFT' ||
      itemCode.startsWith('TOTAL_') ||
      description === 'TOTAL RENTAL SUB' ||
      description === 'TOTAL RENTAL' ||
      description === 'TOTAL SUB'
    );
  });

const pushInvoiceItem = (
  invoiceItems: any[],
  vehicle: Record<string, any>,
  companyName: string,
  regFleetDisplay: string,
  itemCode: string,
  description: string,
  comments: string,
  amount: number,
) => {
  const vatAmount = amount * 0.15;
  const totalInclVat = amount + vatAmount;

  invoiceItems.push({
    reg: vehicle.reg || null,
    fleetNumber: vehicle.fleet_number || null,
    regFleetDisplay,
    item_code: itemCode,
    description,
    company: comments,
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
    totalRentalSub: totalInclVat.toFixed(2),
  });

  return totalInclVat;
};

const resolveInvoiceItemCode = (
  labels: string[],
  monthlyRental: number,
  monthlySub: number,
) => {
  const normalizedLabels = Array.from(
    new Set(
      labels
        .map((label) => String(label || '').trim())
        .filter(Boolean),
    ),
  );

  const hasRental = monthlyRental > 0;
  const hasSubscription = monthlySub > 0;

  if (normalizedLabels.length === 1) {
    return normalizedLabels[0].toUpperCase();
  }

  if (hasRental && hasSubscription) {
    return 'MONTHLY RENTAL + SUBSCRIPTION';
  }

  if (hasRental) {
    return 'MONTHLY RENTAL';
  }

  if (hasSubscription) {
    return 'MONTHLY SUBSCRIPTION';
  }

  return normalizedLabels.join(' + ').toUpperCase() || 'MONTHLY BILLING';
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');
    const billingMonth = normalizeBillingMonth(searchParams.get('billingMonth'));

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    let storedInvoiceQuery = supabase
      .from('account_invoices')
      .select('*')
      .eq('account_number', accountNumber)
      .order('created_at', { ascending: false })
      .limit(1);

    storedInvoiceQuery = billingMonth
      ? storedInvoiceQuery.eq('billing_month', billingMonth)
      : storedInvoiceQuery;

    const { data: storedInvoiceRows, error: storedInvoiceError } = await storedInvoiceQuery;
    if (storedInvoiceError) {
      console.error('Error fetching stored account invoice:', storedInvoiceError);
      throw storedInvoiceError;
    }

    const storedInvoice = Array.isArray(storedInvoiceRows) ? storedInvoiceRows[0] || null : null;

    const { data: costCenterRows, error: costCenterError } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('cost_code', accountNumber)
      .order('created_at', { ascending: false })
      .limit(1);

    if (costCenterError) {
      console.error('Error fetching cost center for invoice:', costCenterError);
      throw costCenterError;
    }

    const costCenter = Array.isArray(costCenterRows) ? costCenterRows[0] || null : null;

    // Fetch all vehicle fields
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .or(`account_number.eq.${accountNumber},new_account_number.eq.${accountNumber}`);

    if (error) throw error;
    if ((!vehicles || vehicles.length === 0) && !storedInvoice) {
      return NextResponse.json({ 
        success: true,
        accountNumber,
        invoiceData: null,
        message: 'No vehicle data found'
      });
    }

    const companyName =
      storedInvoice?.company_name ||
      costCenter?.legal_name ||
      costCenter?.company ||
      '';
    const clientAddress =
      storedInvoice?.client_address ||
      buildAddress(costCenter);
    const customerVatNumber =
      storedInvoice?.customer_vat_number ||
      costCenter?.vat_number ||
      '';

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
      'skyspy_rental',
      'skyspy_sub',
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
      'eps_software_development',
      'maysene_software_development',
      'waterford_software_development',
      'klaver_software_development',
      'advatrans_software_development',
      'tt_linehaul_software_development',
      'tt_express_software_development',
      'tt_fmcg_software_development',
      'rapid_freight_software_development',
      'remco_freight_software_development',
      'vt_logistics_software_development',
      'epilite_software_development',
      'mtx_mc202x_rental',
      'mtx_mc202x_sub',
      'driver_app',
      'total_rental_sub',
      'total_rental',
      'total_sub',
      'software',
      'additional_data'
    ]);

    (vehicles || []).forEach((vehicle) => {
      let regFleetDisplay = '';
      if (vehicle.reg && vehicle.fleet_number) {
        regFleetDisplay = `${vehicle.reg} / ${vehicle.fleet_number}`;
      } else {
        regFleetDisplay = vehicle.reg || vehicle.fleet_number || '';
      }

      const billedItemLabels: string[] = [];

      Object.keys(vehicle).forEach((key) => {
        if (!BILLABLE_COLUMNS.has(key) || TOTAL_BILLING_COLUMNS.has(key)) return;

        const amount = toAmount(vehicle[key]);
        if (amount <= 0) return;
        billedItemLabels.push(normalizeBillingLabel(key));
      });

      const monthlyRental = toAmount(vehicle.total_rental);
      const monthlySub = toAmount(vehicle.total_sub);
      const totalExVat = monthlyRental + monthlySub;

      if (totalExVat > 0) {
        const uniqueLabels = Array.from(
          new Set(
            billedItemLabels
              .map((label) => String(label || '').trim())
              .filter(Boolean),
          ),
        );

        if (uniqueLabels.length === 0) {
          if (monthlyRental > 0) uniqueLabels.push('Monthly Rental');
          if (monthlySub > 0) uniqueLabels.push('Monthly Subscription');
        }

        const itemCode = resolveInvoiceItemCode(uniqueLabels, monthlyRental, monthlySub);

        totalAmount += pushInvoiceItem(
          invoiceItems,
          vehicle,
          companyName,
          regFleetDisplay,
          itemCode,
          uniqueLabels.join(', '),
          vehicle.company || companyName,
          totalExVat,
        );
      }
    });

    const storedLineItems =
      Array.isArray(storedInvoice?.line_items) && storedInvoice.line_items.length > 0
        ? storedInvoice.line_items
        : [];
    const useStoredLineItems =
      storedLineItems.length > 0 && !hasLegacyStoredLineItems(storedLineItems);
    const resolvedLineItems = useStoredLineItems ? storedLineItems : invoiceItems;

    const resolvedSubtotal =
      (useStoredLineItems ? storedInvoice?.subtotal : null) ??
      resolvedLineItems.reduce(
        (sum, item) =>
          sum +
          (parseFloat(
            String(
              item.amountExcludingVat ??
              item.total_excl_vat ??
              item.unit_price_without_vat ??
              item.unit_price ??
              0,
            ),
          ) || 0),
        0,
      );

    const resolvedVat =
      (useStoredLineItems ? storedInvoice?.vat_amount : null) ??
      resolvedLineItems.reduce(
        (sum, item) => sum + (parseFloat(String(item.vat_amount ?? item.vatAmount ?? 0)) || 0),
        0,
      );

    const resolvedTotal =
      (useStoredLineItems ? storedInvoice?.total_amount : null) ??
      resolvedLineItems.reduce(
        (sum, item) =>
          sum +
          (parseFloat(
            String(
              item.total_including_vat ??
              item.total_incl_vat ??
              item.totalRentalSub ??
              0,
            ),
          ) || 0),
        0,
      );

    const invoiceData = {
      company_name: companyName,
      account_number: accountNumber,
      billing_month: billingMonth,
      invoice_date: storedInvoice?.invoice_date || new Date().toISOString(),
      invoice_number: storedInvoice?.invoice_number || '',
      client_address: storedInvoice?.client_address || clientAddress,
      customer_vat_number: customerVatNumber,
      notes: storedInvoice?.notes || '',
      invoice_items: resolvedLineItems,
      invoiceItems: resolvedLineItems,
      total_amount: resolvedTotal,
      subtotal: resolvedSubtotal,
      vat_amount: resolvedVat,
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
