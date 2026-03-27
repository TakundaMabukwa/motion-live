import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const TOTAL_BILLING_COLUMNS = new Set(["total_rental_sub", "total_rental", "total_sub"]);
const SERVICE_ONLY_COLUMNS = new Set([
  "consultancy",
  "roaming",
  "maintenance",
  "after_hours",
  "controlroom",
  "software",
  "eps_software_development",
  "maysene_software_development",
  "waterford_software_development",
  "klaver_software_development",
  "advatrans_software_development",
  "tt_linehaul_software_development",
  "tt_express_software_development",
  "tt_fmcg_software_development",
  "rapid_freight_software_development",
  "remco_freight_software_development",
  "vt_logistics_software_development",
  "epilite_software_development",
  "additional_data",
  "driver_app",
]);
const BILLING_COLUMN_LABELS: Record<string, string> = {
  skylink_trailer_unit_rental: "Skylink Trailer Unit Rental",
  skylink_trailer_sub: "Skylink Trailer Unit Subscription",
  sky_on_batt_ign_rental: "Sky On Batt Ign Rental",
  sky_on_batt_sub: "Sky On Batt Ign Subscription",
  skylink_voice_kit_rental: "Skylink Voice Kit Rental",
  skylink_voice_kit_sub: "Skylink Voice Kit Subscription",
  sky_scout_12v_rental: "Sky Scout 12V Rental",
  sky_scout_12v_sub: "Sky Scout 12V Subscription",
  sky_scout_24v_rental: "Sky Scout 24V Rental",
  sky_scout_24v_sub: "Sky Scout 24V Subscription",
  skylink_pro_rental: "Skylink Pro Rental",
  skylink_pro_sub: "Skylink Pro Subscription",
  skyspy_rental: "SkySpy Rental",
  skyspy_sub: "SkySpy Subscription",
  sky_idata_rental: "Sky IData Rental",
  sky_ican_rental: "Sky ICan Rental",
  industrial_panic_rental: "Industrial Panic Rental",
  flat_panic_rental: "Flat Panic Rental",
  buzzer_rental: "Buzzer Rental",
  tag_rental: "Tag Rental",
  tag_reader_rental: "Tag Reader Rental",
  keypad_rental: "Keypad Rental",
  early_warning_rental: "Early Warning Rental",
  cia_rental: "CIA Rental",
  fm_unit_rental: "FM Unit Rental",
  fm_unit_sub: "FM Unit Subscription",
  gps_rental: "GPS Rental",
  gsm_rental: "GSM Rental",
  tag_rental_: "Tag Rental",
  tag_reader_rental_: "Tag Reader Rental",
  main_fm_harness_rental: "Main FM Harness Rental",
  beame_1_rental: "Beame Rental",
  beame_1_sub: "Beame Subscription",
  beame_2_rental: "Beame Rental",
  beame_2_sub: "Beame Subscription",
  beame_3_rental: "Beame Rental",
  beame_3_sub: "Beame Subscription",
  beame_4_rental: "Beame Rental",
  beame_4_sub: "Beame Subscription",
  beame_5_rental: "Beame Rental",
  beame_5_sub: "Beame Subscription",
  single_probe_rental: "Single Probe Rental",
  single_probe_sub: "Single Probe Subscription",
  dual_probe_rental: "Dual Probe Rental",
  dual_probe_sub: "Dual Probe Subscription",
  _7m_harness_for_probe_rental: "7M Harness For Probe Rental",
  tpiece_rental: "T-Piece Rental",
  idata_rental: "IData Rental",
  _1m_extension_cable_rental: "1M Extension Cable Rental",
  _3m_extension_cable_rental: "3M Extension Cable Rental",
  _4ch_mdvr_rental: "4CH MDVR Rental",
  _4ch_mdvr_sub: "4CH MDVR Subscription",
  _5ch_mdvr_rental: "5CH MDVR Rental",
  _5ch_mdvr_sub: "5CH MDVR Subscription",
  _8ch_mdvr_rental: "8CH MDVR Rental",
  _8ch_mdvr_sub: "8CH MDVR Subscription",
  a2_dash_cam_rental: "A2 Dash Cam Rental",
  a2_dash_cam_sub: "A2 Dash Cam Subscription",
  a3_dash_cam_ai_rental: "A3 Dash Cam AI Rental",
  _5m_cable_for_camera_4pin_rental: "5M Camera Cable 4 Pin Rental",
  _5m_cable_6pin_rental: "5M Cable 6 Pin Rental",
  _10m_cable_for_camera_4pin_rental: "10M Camera Cable 4 Pin Rental",
  a2_mec_5_rental: "A2 MEC 5 Rental",
  vw400_dome_1_rental: "VW400 Dome Rental",
  vw400_dome_2_rental: "VW400 Dome Rental",
  vw300_dakkie_dome_1_rental: "VW300 Dakkie Dome Rental",
  vw300_dakkie_dome_2_rental: "VW300 Dakkie Dome Rental",
  vw502_dual_lens_camera_rental: "VW502 Dual Lens Camera Rental",
  vw303_driver_facing_camera_rental: "VW303 Driver Facing Camera Rental",
  vw502f_road_facing_camera_rental: "VW502F Road Facing Camera Rental",
  vw306_dvr_road_facing_for_4ch_8ch_rental: "VW306 DVR Road Facing Rental",
  vw306m_a2_dash_cam_rental: "VW306M A2 Dash Cam Rental",
  dms01_driver_facing_rental: "DMS01 Driver Facing Rental",
  adas_02_road_facing_rental: "ADAS 02 Road Facing Rental",
  vw100ip_driver_facing_rental: "VW100IP Driver Facing Rental",
  sd_card_1tb_rental: "SD Card 1TB Rental",
  sd_card_2tb_rental: "SD Card 2TB Rental",
  sd_card_480gb_rental: "SD Card 480GB Rental",
  sd_card_256gb_rental: "SD Card 256GB Rental",
  sd_card_512gb_rental: "SD Card 512GB Rental",
  sd_card_250gb_rental: "SD Card 250GB Rental",
  mic_rental: "Mic Rental",
  speaker_rental: "Speaker Rental",
  pfk_main_unit_rental: "PFK Main Unit Rental",
  pfk_main_unit_sub: "PFK Main Unit Subscription",
  breathaloc_rental: "Breathaloc Rental",
  pfk_road_facing_rental: "PFK Road Facing Rental",
  pfk_driver_facing_rental: "PFK Driver Facing Rental",
  pfk_dome_1_rental: "PFK Dome Rental",
  pfk_dome_2_rental: "PFK Dome Rental",
  pfk_5m_rental: "PFK 5M Rental",
  pfk_10m_rental: "PFK 10M Rental",
  pfk_15m_rental: "PFK 15M Rental",
  pfk_20m_rental: "PFK 20M Rental",
  roller_door_switches_rental: "Roller Door Switches Rental",
  consultancy: "Consultancy",
  roaming: "Roaming",
  maintenance: "Maintenance",
  after_hours: "After Hours",
  controlroom: "Control Room",
  software: "Software",
  additional_data: "Additional Data",
  eps_software_development: "EPS Software Development",
  maysene_software_development: "Maysene Software Development",
  waterford_software_development: "Waterford Software Development",
  klaver_software_development: "Klaver Software Development",
  advatrans_software_development: "Advatrans Software Development",
  tt_linehaul_software_development: "TT Linehaul Software Development",
  tt_express_software_development: "TT Express Software Development",
  tt_fmcg_software_development: "TT FMCG Software Development",
  rapid_freight_software_development: "Rapid Freight Software Development",
  remco_freight_software_development: "Remco Freight Software Development",
  vt_logistics_software_development: "VT Logistics Software Development",
  epilite_software_development: "Epilite Software Development",
  mtx_mc202x_rental: "MTX MC202X Rental",
  mtx_mc202x_sub: "MTX MC202X Subscription",
  driver_app: "Driver App",
};
const BILLING_COLUMNS = Array.from(
  new Set([...Object.keys(BILLING_COLUMN_LABELS), ...Array.from(SERVICE_ONLY_COLUMNS)]),
);

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

const fetchAllCostCenters = async (
  supabase: ReturnType<typeof getSupabase>,
) => {
  const allCostCenters: Array<Record<string, unknown>> = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("cost_centers")
      .select(
        "cost_code, company, legal_name, vat_number, registration_number, physical_address_1, physical_address_2, physical_address_3, physical_area, physical_code",
      )
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allCostCenters.push(...data);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allCostCenters;
};

const toAmount = (value: unknown) => {
  const amount = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(amount) ? amount : 0;
};

const formatColumnLabel = (value: string) =>
  value
    .replace(/^_+/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeBillingLabel = (value: string) =>
  BILLING_COLUMN_LABELS[value] ||
  formatColumnLabel(value)
    .replace(/\bSub\b/gi, "Subscription")
    .replace(/\bRental\b/gi, "Rental");

const resolveInvoiceItemCode = (labels: string[], vehicle: Record<string, unknown>) => {
  const normalizedLabels = Array.from(
    new Set(
      labels
        .map((label) => String(label || "").trim())
        .filter(Boolean),
    ),
  );

  const hasRental = toAmount(vehicle.total_rental) > 0;
  const hasSubscription = toAmount(vehicle.total_sub) > 0;

  if (normalizedLabels.length === 1) {
    return normalizedLabels[0].toUpperCase();
  }

  if (hasRental && hasSubscription) {
    return "MONTHLY RENTAL + SUBSCRIPTION";
  }

  if (hasRental) {
    return "MONTHLY RENTAL";
  }

  if (hasSubscription) {
    return "MONTHLY SUBSCRIPTION";
  }

  return normalizedLabels.join(" + ").toUpperCase() || "MONTHLY BILLING";
};

const calculateVehicleExVat = (vehicle: Record<string, unknown>) => {
  const totalRentalSub = toAmount(vehicle.total_rental_sub);
  const totalRental = toAmount(vehicle.total_rental);
  const totalSubscription = toAmount(vehicle.total_sub);
  if (totalRentalSub > 0) {
    return Number(totalRentalSub.toFixed(2));
  }

  const totalFromSummary = Number((totalRental + totalSubscription).toFixed(2));
  if (totalFromSummary > 0) {
    return totalFromSummary;
  }

  return 0;
};

const applyCellStyle = (
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnIndex: number,
  style: Record<string, unknown>,
) => {
  const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
  const cell = worksheet[cellRef];
  if (!cell) return;
  cell.s = style;
};

const applyRowStyle = (
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnCount: number,
  style: Record<string, unknown>,
) => {
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    applyCellStyle(worksheet, rowIndex, columnIndex, style);
  }
};

const baseBorder = {
  top: { style: "thin", color: { rgb: "D1D5DB" } },
  bottom: { style: "thin", color: { rgb: "D1D5DB" } },
  left: { style: "thin", color: { rgb: "D1D5DB" } },
  right: { style: "thin", color: { rgb: "D1D5DB" } },
};

const styles = {
  title: {
    font: { bold: true, sz: 16, color: { rgb: "0F172A" } },
    alignment: { vertical: "center", horizontal: "left" },
    fill: { fgColor: { rgb: "E2E8F0" } },
    border: baseBorder,
  },
  metaHeader: {
    font: { bold: true, sz: 10, color: { rgb: "111827" } },
    alignment: { horizontal: "center", vertical: "center" },
    fill: { fgColor: { rgb: "E5E7EB" } },
    border: baseBorder,
  },
  metaValue: {
    font: { sz: 10, color: { rgb: "111827" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: baseBorder,
  },
  lineHeader: {
    font: { bold: true, sz: 10, color: { rgb: "111827" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    fill: { fgColor: { rgb: "E5E7EB" } },
    border: baseBorder,
  },
  lineValue: {
    font: { sz: 10, color: { rgb: "111827" } },
    alignment: { vertical: "center", horizontal: "left", wrapText: true },
    border: baseBorder,
  },
  lineValueCenter: {
    font: { sz: 10, color: { rgb: "111827" } },
    alignment: { vertical: "center", horizontal: "center" },
    border: baseBorder,
  },
  moneyValue: {
    font: { sz: 10, color: { rgb: "111827" } },
    alignment: { vertical: "center", horizontal: "right" },
    border: baseBorder,
    numFmt: '"R" #,##0.00',
  },
  totalLabel: {
    font: { bold: true, sz: 10, color: { rgb: "111827" } },
    alignment: { vertical: "center", horizontal: "right" },
    fill: { fgColor: { rgb: "F3F4F6" } },
    border: baseBorder,
  },
  totalValue: {
    font: { bold: true, sz: 10, color: { rgb: "111827" } },
    alignment: { vertical: "center", horizontal: "right" },
    fill: { fgColor: { rgb: "F9FAFB" } },
    border: baseBorder,
    numFmt: '"R" #,##0.00',
  },
};

export async function GET() {
  try {
    const supabase = getSupabase();

    const allVehicles: Array<Record<string, unknown>> = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          `reg, fleet_number, company, new_account_number, account_number, total_rental_sub, total_rental, total_sub, ${BILLING_COLUMNS.join(", ")}`,
        )
        .order("new_account_number", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      allVehicles.push(...data);

      if (data.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    if (allVehicles.length === 0) {
      return NextResponse.json({ error: "No vehicles found" }, { status: 404 });
    }

    const groupedVehicles = new Map<string, Array<Record<string, unknown>>>();

    allVehicles.forEach((vehicle) => {
      const accountNumber = String(vehicle.new_account_number || vehicle.account_number || "").trim().toUpperCase();
      if (!accountNumber) return;

      const existing = groupedVehicles.get(accountNumber) || [];
      existing.push(vehicle);
      groupedVehicles.set(accountNumber, existing);
    });

    const accountNumbers = Array.from(groupedVehicles.keys());
    const costCenterMap = new Map<string, Record<string, unknown>>();

    const costCenters = await fetchAllCostCenters(supabase);

    (costCenters || []).forEach((row) => {
      const key = String(row.cost_code || "").trim().toUpperCase();
      if (key && !costCenterMap.has(key)) {
        costCenterMap.set(key, row);
      }
    });

    const matchedAccountNumbers = accountNumbers.filter((accountNumber) =>
      costCenterMap.has(accountNumber),
    );

    const worksheetRows: Array<Array<string | number>> = [];
    const sectionMeta: Array<{
      titleRow: number;
      metaHeaderRow: number;
      metaValueRow: number;
      lineHeaderRow: number;
      firstLineRow: number;
      lastLineRow: number;
      totalRows: number[];
    }> = [];

    matchedAccountNumbers.forEach((accountNumber, invoiceIndex) => {
      const vehicles = groupedVehicles.get(accountNumber) || [];
      const costCenter = costCenterMap.get(accountNumber);
      if (!costCenter) {
        return;
      }
      const companyName =
        String(
          costCenter?.legal_name ||
            costCenter?.company ||
            vehicles[0]?.company ||
            accountNumber,
        ).trim();
      const customerVatNumber = String(costCenter?.vat_number || "").trim();

      if (invoiceIndex > 0) {
        worksheetRows.push([]);
        worksheetRows.push([]);
      }

      const titleRow = worksheetRows.length;
      worksheetRows.push([companyName]);
      worksheetRows.push([]);

      const metaHeaderRow = worksheetRows.length;
      worksheetRows.push(["Account", "Your Reference", "VAT %", "Customer Vat Number"]);
      const metaValueRow = worksheetRows.length;
      worksheetRows.push([accountNumber, companyName, "VAT 15%", customerVatNumber]);
      worksheetRows.push([]);

      const lineHeaderRow = worksheetRows.length;
      worksheetRows.push([
        "Previous Reg",
        "New Reg",
        "Item Code",
        "Description",
        "Comments",
        "Units",
        "Unit Price",
        "Vat",
        "Vat%",
        "Total Incl",
      ]);

      let subtotal = 0;
      let vatTotal = 0;
      let totalIncl = 0;
      const firstLineRow = worksheetRows.length;
      let lastLineRow = firstLineRow - 1;

      vehicles.forEach((vehicle) => {
        const totalExVat = calculateVehicleExVat(vehicle);
        if (totalExVat <= 0) {
          return;
        }

        const billedItemLabels = Object.keys(vehicle)
          .filter((key) => !TOTAL_BILLING_COLUMNS.has(key))
          .filter((key) => BILLING_COLUMNS.includes(key))
          .filter((key) => toAmount(vehicle[key]) > 0)
          .map((key) => normalizeBillingLabel(key));

        const uniqueLabels = Array.from(
          new Set(
            billedItemLabels
              .map((label) => String(label || "").trim())
              .filter(Boolean),
          ),
        );

        if (uniqueLabels.length === 0) {
          const hasRental = toAmount(vehicle.total_rental) > 0;
          const hasSubscription = toAmount(vehicle.total_sub) > 0;

          if (hasRental) uniqueLabels.push("Monthly Rental");
          if (hasSubscription) uniqueLabels.push("Monthly Subscription");
        }

        const itemCode = resolveInvoiceItemCode(uniqueLabels, vehicle);
        const description =
          uniqueLabels.join(", ") || "MONTHLY SERVICE SUBSCRIPTION";

        const vatAmount = Number((totalExVat * 0.15).toFixed(2));
        const totalIncludingVat = Number((totalExVat + vatAmount).toFixed(2));

        subtotal += totalExVat;
        vatTotal += vatAmount;
        totalIncl += totalIncludingVat;

        worksheetRows.push([
          String(vehicle.reg || "-"),
          String(vehicle.reg || "-"),
          itemCode,
          description,
          String(vehicle.company || companyName || "-"),
          1,
          totalExVat,
          vatAmount,
          "15%",
          totalIncludingVat,
        ]);
        lastLineRow = worksheetRows.length - 1;
      });

      worksheetRows.push([]);
      const totalRowIndexes = [
        worksheetRows.length,
        worksheetRows.length + 1,
        worksheetRows.length + 2,
      ];
      worksheetRows.push(["", "", "", "", "", "", "Total Ex. VAT", "", "", Number(subtotal.toFixed(2))]);
      worksheetRows.push(["", "", "", "", "", "", "VAT", "", "", Number(vatTotal.toFixed(2))]);
      worksheetRows.push(["", "", "", "", "", "", "Total Incl. VAT", "", "", Number(totalIncl.toFixed(2))]);

      sectionMeta.push({
        titleRow,
        metaHeaderRow,
        metaValueRow,
        lineHeaderRow,
        firstLineRow,
        lastLineRow,
        totalRows: totalRowIndexes,
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);
    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 22 },
      { wch: 42 },
      { wch: 30 },
      { wch: 8 },
      { wch: 14 },
      { wch: 12 },
      { wch: 8 },
      { wch: 14 },
    ];
    worksheet["!freeze"] = { xSplit: 0, ySplit: 0 };
    worksheet["!merges"] = sectionMeta.flatMap((section) => [
      {
        s: { r: section.titleRow, c: 0 },
        e: { r: section.titleRow, c: 9 },
      },
    ]);

    sectionMeta.forEach((section) => {
      applyRowStyle(worksheet, section.titleRow, 10, styles.title);
      applyRowStyle(worksheet, section.metaHeaderRow, 4, styles.metaHeader);
      applyRowStyle(worksheet, section.metaValueRow, 4, styles.metaValue);
      applyRowStyle(worksheet, section.lineHeaderRow, 10, styles.lineHeader);

      for (let rowIndex = section.firstLineRow; rowIndex <= section.lastLineRow; rowIndex += 1) {
        applyRowStyle(worksheet, rowIndex, 10, styles.lineValue);
        applyCellStyle(worksheet, rowIndex, 5, styles.lineValueCenter);
        applyCellStyle(worksheet, rowIndex, 6, styles.moneyValue);
        applyCellStyle(worksheet, rowIndex, 7, styles.moneyValue);
        applyCellStyle(worksheet, rowIndex, 8, styles.lineValueCenter);
        applyCellStyle(worksheet, rowIndex, 9, styles.moneyValue);
      }

      section.totalRows.forEach((rowIndex) => {
        applyCellStyle(worksheet, rowIndex, 6, styles.totalLabel);
        applyCellStyle(worksheet, rowIndex, 9, styles.totalValue);
      });
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Client Invoices");

    const fileBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
    });

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"All_Client_Invoices_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx\"`,
      },
    });
  } catch (error) {
    console.error("Bulk client invoice excel error:", error);
    return NextResponse.json(
      { error: "Failed to generate client invoice Excel file" },
      { status: 500 },
    );
  }
}
