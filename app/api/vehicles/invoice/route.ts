import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeBillingMonth } from '@/lib/server/account-invoice-payments';

export const dynamic = 'force-dynamic';

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

const normalizeTextValue = (value: unknown) => String(value || '').trim();

const TOTAL_BILLING_COLUMNS = new Set([
  'total_rental_sub',
  'total_rental',
  'total_sub',
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
  category?: string,
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
    category: category || null,
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

const calculateInvoiceFinancials = (items: any[]) =>
  items.reduce(
    (acc, item) => {
      const units = Math.max(
        1,
        parseFloat(String(item.units ?? item.quantity ?? 1)) || 1,
      );
      const explicitUnitExVat =
        parseFloat(
          String(
            item.unit_price_without_vat ??
              item.unit_price_ex_vat ??
              item.unit_price ??
              0,
          ),
        ) || 0;
      const explicitLineExVat =
        parseFloat(
          String(
            item.total_excl_vat ??
              item.subtotal ??
              item.amountExcludingVat ??
              0,
          ),
        ) || 0;
      const exVatLineTotal =
        explicitLineExVat > 0 ? explicitLineExVat : explicitUnitExVat * units;

      const explicitVat =
        parseFloat(
          String(
            item.vat_amount ??
              item.vatAmount ??
              item.total_vat ??
              0,
          ),
        ) || 0;

      const explicitIncl =
        parseFloat(
          String(
            item.total_including_vat ??
              item.total_incl_vat ??
              item.total_incl ??
              item.totalIncl ??
              item.totalRentalSub ??
              0,
          ),
        ) || 0;
      const vatLineTotal =
        explicitVat > 0
          ? explicitVat
          : explicitIncl > 0 && exVatLineTotal > 0
            ? Math.max(0, explicitIncl - exVatLineTotal)
            : exVatLineTotal * 0.15;
      const totalInclLine = exVatLineTotal + vatLineTotal;

      acc.subtotal += exVatLineTotal;
      acc.vatAmount += vatLineTotal;
      acc.totalAmount += totalInclLine;
      return acc;
    },
    { subtotal: 0, vatAmount: 0, totalAmount: 0 },
  );

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

const EPS_SPECIAL_SOURCE_ACCOUNT = 'EPSC-0001';

const EPS_GROUPS = [
  {
    code: 'EPS002',
    name: 'EPS COURIER SERVICES (PTY)LTD ( SKY )',
    bucket: 'sky',
  },
  {
    code: 'EPS003',
    name: 'EPS COURIER SERVICES (PTY)LTD ( BEAME )',
    bucket: 'beame',
  },
  {
    code: 'EPS004',
    name: 'EPS COURIER SERVICES (PTY)LTD ( PRIVATE )',
    bucket: 'pvt',
  },
  {
    code: 'ROUTING',
    name: 'EPS COURIER SERVICES (PTY)LTD ( ROUTING )',
    bucket: 'routing',
  },
  {
    code: 'DASHBOARD',
    name: 'EPS COURIER SERVICES (PTY)LTD ( DASHBOARD )',
    bucket: 'dashboard',
  },
] as const;

const EPS_GROUP_BY_CODE = new Map(
  EPS_GROUPS.map((group) => [group.code, group]),
);

const EPS_GROUP_BY_BUCKET = new Map(
  EPS_GROUPS.map((group) => [group.bucket, group]),
);

const EPS_PVT_TOTAL = 574;
const EPS_BEAME_TOTAL = 80;

const EPS_BEAME_COLUMNS = new Set([
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
]);

const EPS_CAMERA_COLUMNS = new Set([
  '_4ch_mdvr_rental',
  '_4ch_mdvr_sub',
  '_5ch_mdvr_rental',
  '_5ch_mdvr_sub',
  '_8ch_mdvr_rental',
  '_8ch_mdvr_sub',
  'a2_dash_cam_rental',
  'a2_dash_cam_sub',
  'a3_dash_cam_ai_rental',
  'vw502_dual_lens_camera_rental',
  'vw303_driver_facing_camera_rental',
  'vw502f_road_facing_camera_rental',
  'vw306_dvr_road_facing_for_4ch_8ch_rental',
  'vw306m_a2_dash_cam_rental',
  'dms01_driver_facing_rental',
  'adas_02_road_facing_rental',
  'vw100ip_driver_facing_rental',
]);

const isSameAmount = (left: number, right: number) => Math.abs(left - right) < 0.001;

const getVehicleDisplay = (vehicle: Record<string, any>) => {
  if (vehicle.reg && vehicle.fleet_number) {
    return `${vehicle.reg} / ${vehicle.fleet_number}`;
  }

  return vehicle.reg || vehicle.fleet_number || '';
};

const getBillingCutoff = (billingMonth: string | null) => {
  const normalized = String(billingMonth || '').trim();
  if (!normalized.startsWith('2026-03')) {
    return null;
  }

  return '2026-03-30T23:59:59.999Z';
};

const getEpsCategoryLabel = (groupCode: string) => {
  const group = EPS_GROUP_BY_CODE.get(groupCode);
  return group?.name || groupCode;
};

const EPS_BREAKDOWN_ORDER = ['beame', 'camera', 'consultancy', 'controlroom', 'canbus', 'trailer'] as const;

const getEpsBreakdownAmounts = (vehicle: Record<string, any>) => ({
  beame: EPS_BEAME_COLUMNS.size
    ? Array.from(EPS_BEAME_COLUMNS).reduce((sum, column) => sum + toAmount(vehicle[column]), 0)
    : 0,
  camera: EPS_CAMERA_COLUMNS.size
    ? Array.from(EPS_CAMERA_COLUMNS).reduce((sum, column) => sum + toAmount(vehicle[column]), 0)
    : 0,
  consultancy: toAmount(vehicle.consultancy),
  controlroom: toAmount(vehicle.controlroom),
  canbus: toAmount(vehicle.sky_ican_rental),
  trailer: toAmount(vehicle.skylink_trailer_unit_rental) + toAmount(vehicle.skylink_trailer_sub),
  routing: toAmount(vehicle.software) + toAmount(vehicle.driver_app) + toAmount(vehicle.additional_data),
  dashboard: toAmount(vehicle.eps_software_development),
});

const getEpsPrimaryBucket = (
  totalRentalSub: number,
  breakdown: ReturnType<typeof getEpsBreakdownAmounts>,
) => {
  const hasMainBreakdown =
    breakdown.beame > 0 ||
    breakdown.camera > 0 ||
    breakdown.consultancy > 0 ||
    breakdown.controlroom > 0 ||
    breakdown.canbus > 0 ||
    breakdown.trailer > 0;

  if (
    isSameAmount(totalRentalSub, EPS_BEAME_TOTAL) &&
    breakdown.beame > 0 &&
    breakdown.camera === 0 &&
    breakdown.consultancy === 0 &&
    breakdown.controlroom === 0 &&
    breakdown.canbus === 0 &&
    breakdown.trailer === 0
  ) {
    return 'beame';
  }

  if (
    isSameAmount(totalRentalSub, EPS_PVT_TOTAL) &&
    breakdown.beame > 0 &&
    breakdown.consultancy > 0 &&
    breakdown.controlroom > 0 &&
    breakdown.camera === 0 &&
    breakdown.canbus === 0 &&
    breakdown.trailer === 0
  ) {
    return 'pvt';
  }

  if (hasMainBreakdown) {
    return 'sky';
  }

  return null;
};

const getEpsDescriptionForCategory = (category: string) => {
  switch (category) {
    case 'beame':
      return 'BEAME';
    case 'camera':
      return 'CAMERA';
    case 'consultancy':
      return 'CONSULTANCY';
    case 'controlroom':
      return 'CONTROLROOM';
    case 'canbus':
      return 'CANBUS';
    case 'trailer':
      return 'SKY TRAILER UNIT';
    default:
      return category.toUpperCase();
  }
};

const buildEpsInvoiceData = (
  vehicles: Record<string, any>[],
  companyName: string,
) => {
  const itemsByCode = new Map<string, any[]>(
    EPS_GROUPS.map((group) => [group.code, []]),
  );

  vehicles.forEach((vehicle) => {
    const regFleetDisplay = getVehicleDisplay(vehicle);
    const totalRentalSub = toAmount(vehicle.total_rental_sub);
    const breakdown = getEpsBreakdownAmounts(vehicle);
    const primaryBucket = getEpsPrimaryBucket(totalRentalSub, breakdown);

    if (primaryBucket) {
      const primaryGroup = EPS_GROUP_BY_BUCKET.get(primaryBucket);
      if (primaryGroup) {
        EPS_BREAKDOWN_ORDER.forEach((category) => {
          const amount = breakdown[category];
          if (amount <= 0) return;

          if (primaryBucket === 'beame' && category !== 'beame') return;
          if (primaryBucket === 'pvt' && !['beame', 'consultancy', 'controlroom'].includes(category)) return;

          pushInvoiceItem(
            itemsByCode.get(primaryGroup.code) || [],
            vehicle,
            companyName,
            regFleetDisplay,
            primaryGroup.code,
            getEpsDescriptionForCategory(category),
            vehicle.company || companyName,
            amount,
            getEpsCategoryLabel(primaryGroup.code),
          );
        });
      }
    }

    if (breakdown.routing > 0) {
      const routingGroup = EPS_GROUP_BY_BUCKET.get('routing');
      if (routingGroup) {
        pushInvoiceItem(
          itemsByCode.get(routingGroup.code) || [],
          vehicle,
          companyName,
          regFleetDisplay,
          routingGroup.code,
          'SERVICES',
          vehicle.company || companyName,
          breakdown.routing,
          getEpsCategoryLabel(routingGroup.code),
        );
      }
    }

    if (breakdown.dashboard > 0) {
      const dashboardGroup = EPS_GROUP_BY_BUCKET.get('dashboard');
      if (dashboardGroup) {
        pushInvoiceItem(
          itemsByCode.get(dashboardGroup.code) || [],
          vehicle,
          companyName,
          regFleetDisplay,
          dashboardGroup.code,
          'SERVICES',
          vehicle.company || companyName,
          breakdown.dashboard,
          getEpsCategoryLabel(dashboardGroup.code),
        );
      }
    }
  });

  const vehicleCountByCode = new Map<string, Set<string>>(
    EPS_GROUPS.map((group) => [group.code, new Set()]),
  );

  EPS_GROUPS.forEach((group) => {
    const items = itemsByCode.get(group.code) || [];
    items.forEach((item) => {
      const vehicleKey = String(item.reg || item.fleetNumber || item.regFleetDisplay || item.account_number || '');
      if (vehicleKey) {
        vehicleCountByCode.get(group.code)?.add(vehicleKey);
      }
    });
  });

  const groupSummaries = EPS_GROUPS.map((group) => {
    const items = itemsByCode.get(group.code) || [];
    const subtotal = items.reduce(
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
    const vatAmount = items.reduce(
      (sum, item) => sum + (parseFloat(String(item.vat_amount ?? item.vatAmount ?? 0)) || 0),
      0,
    );
    const totalAmount = items.reduce(
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

    return {
      groupCode: group.code,
      accountNumber: group.code,
      accountName: group.name,
      subtotal,
      vatAmount,
      totalAmount,
      vehicleCount: vehicleCountByCode.get(group.code)?.size || 0,
      invoiceItems: items,
    };
  }).filter((group) => group.invoiceItems.length > 0);

  return {
    groupSummaries,
    itemsByCode,
  };
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
    const sourceAccountNumber =
      String(searchParams.get('sourceAccountNumber') || accountNumber || '').trim();
    const billingMonth = normalizeBillingMonth(searchParams.get('billingMonth'));
    const includeGroupSummaries = searchParams.get('includeGroupSummaries') === 'true';
    const billingGroup = String(searchParams.get('billingGroup') || '').trim().toUpperCase();

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
      .eq('cost_code', sourceAccountNumber)
      .order('created_at', { ascending: false })
      .limit(1);

    if (costCenterError) {
      console.error('Error fetching cost center for invoice:', costCenterError);
      throw costCenterError;
    }

    const costCenter = Array.isArray(costCenterRows) ? costCenterRows[0] || null : null;

    // Fetch all vehicle fields
    let vehiclesQuery = supabase
      .from('vehicles')
      .select('*')
      .or(`account_number.eq.${sourceAccountNumber},new_account_number.eq.${sourceAccountNumber}`);

    const billingCutoff = getBillingCutoff(billingMonth);
    if (billingCutoff) {
      vehiclesQuery = vehiclesQuery.lte('created_at', billingCutoff);
    }

    const { data: vehicles, error } = await vehiclesQuery;

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
      costCenter?.legal_name ||
      costCenter?.company ||
      storedInvoice?.company_name ||
      '';
    const clientAddress =
      buildAddress(costCenter) ||
      storedInvoice?.client_address ||
      '';
    const customerVatNumber =
      costCenter?.vat_number ||
      storedInvoice?.customer_vat_number ||
      '';
    const companyRegistrationNumber =
      costCenter?.registration_number ||
      storedInvoice?.company_registration_number ||
      '';

    // Build invoice items
    const invoiceItems: any[] = [];

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

    let groupSummaries: any[] = [];

    if (sourceAccountNumber === EPS_SPECIAL_SOURCE_ACCOUNT) {
      const epsData = buildEpsInvoiceData(vehicles || [], companyName);
      groupSummaries = epsData.groupSummaries;

      if (includeGroupSummaries || billingGroup) {
        const groupAccounts = groupSummaries.map((group) => group.accountNumber);
        let groupedStoredInvoicesQuery = supabase
          .from('account_invoices')
          .select('*')
          .in('account_number', groupAccounts)
          .order('created_at', { ascending: false });

        groupedStoredInvoicesQuery = billingMonth
          ? groupedStoredInvoicesQuery.eq('billing_month', billingMonth)
          : groupedStoredInvoicesQuery;

        const { data: groupedStoredInvoices, error: groupedStoredInvoicesError } =
          await groupedStoredInvoicesQuery;

        if (groupedStoredInvoicesError) {
          console.error('Error fetching EPS grouped stored invoices:', groupedStoredInvoicesError);
          throw groupedStoredInvoicesError;
        }

        const storedInvoicesByAccount = new Map();
        (groupedStoredInvoices || []).forEach((invoice) => {
          const key = String(invoice.account_number || '').trim().toUpperCase();
          if (!key || storedInvoicesByAccount.has(key)) return;
          storedInvoicesByAccount.set(key, invoice);
        });

        groupSummaries = groupSummaries.map((group) => {
          const groupStoredInvoice = storedInvoicesByAccount.get(group.accountNumber);
          return {
            ...group,
            reference: groupStoredInvoice?.invoice_number || '',
            accountInvoiceId: groupStoredInvoice?.id || null,
            billingMonth: groupStoredInvoice?.billing_month || billingMonth,
            paidAmount: Number(groupStoredInvoice?.paid_amount || 0),
            balanceDue:
              Number(
                groupStoredInvoice?.balance_due ??
                  groupStoredInvoice?.total_amount ??
                  group.totalAmount,
              ) || 0,
            paymentStatus: groupStoredInvoice?.payment_status || 'pending',
          };
        });
      }

      if (billingGroup && EPS_GROUP_BY_CODE.has(billingGroup)) {
        const selectedGroupSummary = groupSummaries.find(
          (group) => group.accountNumber === billingGroup,
        );
        if (selectedGroupSummary) {
          invoiceItems.push(...selectedGroupSummary.invoiceItems);
        }
      }
    }

    if (invoiceItems.length === 0) {
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

        pushInvoiceItem(
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
    }

    const storedLineItems =
      Array.isArray(storedInvoice?.line_items) && storedInvoice.line_items.length > 0
        ? storedInvoice.line_items
        : [];
    const isLockedInvoice = Boolean(storedInvoice?.invoice_locked);
    const useStoredLineItems =
      isLockedInvoice &&
      storedLineItems.length > 0 &&
      !hasLegacyStoredLineItems(storedLineItems);
    const resolvedLineItems = useStoredLineItems ? storedLineItems : invoiceItems;

    const lineItemFinancials = calculateInvoiceFinancials(resolvedLineItems);
    const storedSubtotal = parseFloat(String(storedInvoice?.subtotal ?? ''));
    const storedVat = parseFloat(String(storedInvoice?.vat_amount ?? ''));
    const storedTotal = parseFloat(String(storedInvoice?.total_amount ?? ''));
    const storedMatchesLineItems =
      Math.abs((Number.isFinite(storedSubtotal) ? storedSubtotal : 0) - lineItemFinancials.subtotal) < 0.01 &&
      Math.abs((Number.isFinite(storedVat) ? storedVat : 0) - lineItemFinancials.vatAmount) < 0.01 &&
      Math.abs((Number.isFinite(storedTotal) ? storedTotal : 0) - lineItemFinancials.totalAmount) < 0.01;

    const resolvedSubtotal =
      useStoredLineItems && Number.isFinite(storedSubtotal) && storedMatchesLineItems
        ? storedSubtotal
        : lineItemFinancials.subtotal;

    const resolvedVat =
      useStoredLineItems && Number.isFinite(storedVat) && storedMatchesLineItems
        ? storedVat
        : lineItemFinancials.vatAmount;

    const resolvedTotal =
      useStoredLineItems && Number.isFinite(storedTotal) && storedMatchesLineItems
        ? storedTotal
        : lineItemFinancials.totalAmount;

    const invoiceData = {
      company_name: companyName,
      account_number: accountNumber,
      source_account_number: sourceAccountNumber,
      billing_group: billingGroup || null,
      billing_month: billingMonth,
      invoice_date: storedInvoice?.invoice_date || new Date().toISOString(),
      invoice_number: storedInvoice?.invoice_number || '',
      client_address: clientAddress,
      customer_vat_number: customerVatNumber,
      company_registration_number: companyRegistrationNumber,
      notes: storedInvoice?.notes || '',
      invoice_items: resolvedLineItems,
      invoiceItems: resolvedLineItems,
      total_amount: resolvedTotal,
      subtotal: resolvedSubtotal,
      vat_amount: resolvedVat,
      invoice_locked: isLockedInvoice,
      invoice_locked_by: storedInvoice?.invoice_locked_by || null,
      invoice_locked_at: storedInvoice?.invoice_locked_at || null,
      invoice_locked_by_email: storedInvoice?.invoice_locked_by_email || null,
      group_summaries: groupSummaries,
    };

    if (storedInvoice?.id) {
      const currentCompanyName = normalizeTextValue(storedInvoice.company_name);
      const currentClientAddress = normalizeTextValue(storedInvoice.client_address);
      const currentVatNumber = normalizeTextValue(storedInvoice.customer_vat_number);
      const currentRegistrationNumber = normalizeTextValue(storedInvoice.company_registration_number);

      if (
        currentCompanyName !== normalizeTextValue(companyName) ||
        currentClientAddress !== normalizeTextValue(clientAddress) ||
        currentVatNumber !== normalizeTextValue(customerVatNumber) ||
        currentRegistrationNumber !== normalizeTextValue(companyRegistrationNumber)
      ) {
        const { error: syncInvoiceError } = await supabase
          .from('account_invoices')
          .update({
            company_name: companyName || null,
            client_address: clientAddress || null,
            customer_vat_number: customerVatNumber || null,
            company_registration_number: companyRegistrationNumber || null,
          })
          .eq('id', storedInvoice.id);

        if (syncInvoiceError) {
          console.error('Error syncing stored account invoice client info:', syncInvoiceError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      accountNumber,
      sourceAccountNumber,
      invoiceData,
      groupSummaries,
      message: 'Invoice generated successfully'
    });

  } catch (error) {
    console.error('Error in vehicle invoice API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
