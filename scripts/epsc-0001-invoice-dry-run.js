const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const ROOT = process.cwd();
const WORKBOOK_PATH = path.join(ROOT, "supabase", "migrations", "FEB 26 ANNUITY (1).xlsx");
const OUTPUT_PATH = path.join(ROOT, "tmp", "epsc-0001-dry-run-report.json");

const SHEET_GROUPS = {
  "117997": {
    accountNumber: "EPS002",
    accountName: "EPS COURIER SERVICES (PTY)LTD ( SKY)",
  },
  "118080": {
    accountNumber: "EPS003",
    accountName: "EPS COURIER SERVICES (PTY)LTD ( BEAME)",
  },
  "118257": {
    accountNumber: "EPS004",
    accountName: "EPS COURIER SERVICES (PTY)LTD ( PVT)",
  },
  "118299": {
    accountNumber: "118299",
    accountName: "EPS COURIER SERVICES (PTY)LTD ( DASHBOARD)",
  },
  "118300": {
    accountNumber: "118300",
    accountName: "EPS COURIER SERVICES (PTY)LTD ( ROUTING)",
  },
};

const norm = (value) => String(value || "").trim().toUpperCase();

const parseEnvFile = (filePath) =>
  Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1).replace(/^'+|'+$/g, "")];
      }),
  );

const toNumber = (value) => {
  const amount = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(amount) ? amount : 0;
};

async function main() {
  const env = parseEnvFile(path.join(ROOT, ".env.local"));
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("*")
    .or("account_number.eq.EPSC-0001,new_account_number.eq.EPSC-0001");

  if (error) {
    throw error;
  }

  const vehicleByReg = new Map(
    (vehicles || []).map((vehicle) => [norm(vehicle.reg), vehicle]),
  );

  const workbook = XLSX.readFile(WORKBOOK_PATH);
  const report = {
    sourceAccountNumber: "EPSC-0001",
    generatedAt: new Date().toISOString(),
    sheets: [],
    summary: {
      workbookRows: 0,
      matchedRows: 0,
      unmatchedRows: 0,
    },
  };

  for (const [sheetName, group] of Object.entries(SHEET_GROUPS)) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rows = XLSX.utils.sheet_to_json(worksheet, { range: 6, defval: "" });
    const matched = [];
    const unmatched = [];

    for (const row of rows) {
      const reg = norm(row["PREVIOUS REG"]);
      if (!reg) continue;

      report.summary.workbookRows += 1;
      const vehicle = vehicleByReg.get(reg);

      if (!vehicle) {
        report.summary.unmatchedRows += 1;
        unmatched.push({
          reg,
          code: row["CODE"] || "",
          description: row["DESCRIPTION"] || "",
          comments: row["COMMENTS"] || "",
          priceEx: toNumber(row["PRICE EX."]),
          subtotalEx: toNumber(row["SUB TOTAL EX."]),
          totalIncl: toNumber(row["TOTAL INCL."]),
        });
        continue;
      }

      report.summary.matchedRows += 1;
      matched.push({
        reg,
        fleetNumber: vehicle.fleet_number || "",
        accountNumber: group.accountNumber,
        accountName: group.accountName,
        workbook: {
          code: row["CODE"] || "",
          description: row["DESCRIPTION"] || "",
          comments: row["COMMENTS"] || "",
          priceEx: toNumber(row["PRICE EX."]),
          subtotalEx: toNumber(row["SUB TOTAL EX."]),
          totalIncl: toNumber(row["TOTAL INCL."]),
        },
        vehicle: {
          id: vehicle.id,
          totalRentalSub: toNumber(vehicle.total_rental_sub),
          totalRental: toNumber(vehicle.total_rental),
          totalSub: toNumber(vehicle.total_sub),
          beame1Rental: toNumber(vehicle.beame_1_rental),
          beame1Sub: toNumber(vehicle.beame_1_sub),
          beame2Rental: toNumber(vehicle.beame_2_rental),
          skylinkTrailerSub: toNumber(vehicle.skylink_trailer_sub),
          epsSoftwareDevelopment: toNumber(vehicle.eps_software_development),
          software: toNumber(vehicle.software),
          controlroom: toNumber(vehicle.controlroom),
          consultancy: toNumber(vehicle.consultancy),
          skyIcanRental: toNumber(vehicle.sky_ican_rental),
        },
      });
    }

    report.sheets.push({
      sheetName,
      accountNumber: group.accountNumber,
      accountName: group.accountName,
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      matched,
      unmatched,
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

  console.log(`Dry run report written to ${OUTPUT_PATH}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
