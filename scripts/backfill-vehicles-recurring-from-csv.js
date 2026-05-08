#!/usr/bin/env node

/**
 * Backfill recurring billing columns in vehicles + vehicles_duplicate
 * from a CSV export containing invoiced job item rows.
 *
 * Default mode is dry-run. Use --apply to write.
 *
 * Example:
 *   node scripts/backfill-vehicles-recurring-from-csv.js \
 *     --csv tmp/job-card-rental-sub-items-completed-invoiced-install.csv \
 *     --invoice-list scripts/data/invoicpm2 loe-backfill-20260508.txt \
 *     --dry-run
 *
 *   node scripts/backfill-vehicles-recurring-from-csv.js \
 *     --csv tmp/job-card-rental-sub-items-completed-invoiced-install.csv \
 *     --invoice-list scripts/data/invoice-backfill-20260508.txt \
 *     --apply
 */

const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const ts = require("typescript");
const { createClient } = require("@supabase/supabase-js");

const ROOT = process.cwd();

const DEFAULT_CSV = path.join(
  ROOT,
  "tmp",
  "job-card-rental-sub-items-completed-invoiced-install.csv",
);
const DEFAULT_INVOICE_LIST = path.join(
  ROOT,
  "scripts",
  "data",
  "invoice-backfill-20260508.txt",
);
const DEFAULT_JOB_LIST = path.join(
  ROOT,
  "scripts",
  "data",
  "job-backfill-20260508.txt",
);

const SERVICE_ONLY_FIELDS = new Set([
  "consultancy",
  "roaming",
  "maintenance",
  "after_hours",
  "controlroom",
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
  "software",
  "additional_data",
  "driver_app",
]);
const DIRECT_RECURRING_FIELDS = new Set([...SERVICE_ONLY_FIELDS]);

const TOTAL_FIELDS = new Set(["total_rental", "total_sub", "total_rental_sub"]);

const SLOT_FAMILIES = {
  beame: ["beame_1", "beame_2", "beame_3", "beame_4", "beame_5"],
  fuel_probe: ["fuel_probe_1", "fuel_probe_2"],
  vw400_dome: ["vw400_dome_1", "vw400_dome_2"],
  vw300_dakkie_dome: ["vw300_dakkie_dome_1", "vw300_dakkie_dome_2"],
  pfk_dome: ["pfk_dome_1", "pfk_dome_2"],
  tag: ["tag", "tag_"],
  tag_reader: ["tag_reader", "tag_reader_"],
};

const SPECIAL_BILLING_MAP = {
  sky_on_batt_ign_unit: {
    rental: "sky_on_batt_ign_rental",
    sub: "sky_on_batt_sub",
  },
  fuel_probe_1: { rental: "single_probe_rental", sub: "single_probe_sub" },
  fuel_probe_2: { rental: "dual_probe_rental", sub: "dual_probe_sub" },
  tag: { rental: "tag_rental" },
  tag_: { rental: "tag_rental_" },
  tag_reader: { rental: "tag_reader_rental" },
  tag_reader_: { rental: "tag_reader_rental_" },
};

function parseArgs(argv) {
  const args = {
    csv: DEFAULT_CSV,
    invoiceList: DEFAULT_INVOICE_LIST,
    jobList: DEFAULT_JOB_LIST,
    apply: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--csv" && argv[i + 1]) {
      args.csv = path.resolve(ROOT, argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === "--invoice-list" && argv[i + 1]) {
      args.invoiceList = path.resolve(ROOT, argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === "--job-list" && argv[i + 1]) {
      args.jobList = path.resolve(ROOT, argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === "--apply") {
      args.apply = true;
      continue;
    }
    if (token === "--dry-run") {
      args.apply = false;
      continue;
    }
  }

  return args;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith("#"))
      .map((line) => {
        const idx = line.indexOf("=");
        if (idx === -1) return [line.trim(), ""];
        const key = line.slice(0, idx).trim();
        const value = line
          .slice(idx + 1)
          .trim()
          .replace(/^"+|"+$/g, "")
          .replace(/^'+|'+$/g, "");
        return [key, value];
      }),
  );
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round2(value) {
  return Number((toNumber(value)).toFixed(2));
}

function normalizeInvoice(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function buildTemporaryRegistration(...parts) {
  const seed = parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join("|");

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }

  const numeric = String(hash || 1).padStart(5, "0");
  return `TEMP${numeric}`;
}

function readCsvRows(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function readInvoiceFilter(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return new Set();
  }
  return new Set(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((value) => normalizeInvoice(value)),
  );
}

function readJobFilter(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return new Set();
  }
  return new Set(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((value) => String(value).trim().toUpperCase()),
  );
}

async function loadVehicleMappingModule() {
  const tsPath = path.join(ROOT, "lib", "vehicle-product-mapping.ts");
  const source = fs.readFileSync(tsPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: tsPath,
  }).outputText;

  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`;
  return import(dataUrl);
}

function getRecurringAmounts(row) {
  const qty = Math.max(1, toNumber(row.qty || row.quantity || 1));
  const rentalAmount =
    toNumber(row.rental_amount) ||
    toNumber(row.rental_gross) ||
    toNumber(row.rental_price) * qty;
  const subscriptionAmount =
    toNumber(row.subscription_amount) ||
    toNumber(row.subscription_gross) ||
    toNumber(row.subscription_price) * qty;

  return {
    qty,
    rentalAmount: round2(rentalAmount),
    subscriptionAmount: round2(subscriptionAmount),
  };
}

function hasColumn(row, column) {
  return Object.prototype.hasOwnProperty.call(row, column);
}

function getBillingColumnForField(row, field, preferSub, preferRental) {
  const special = SPECIAL_BILLING_MAP[field];
  const allowMissingColumnCheck = row?.id == null;

  const pick = (candidate) => {
    if (!candidate) return null;
    if (hasColumn(row, candidate) || allowMissingColumnCheck) return candidate;
    return null;
  };

  const subField = `${field}_sub`;
  const rentalField = `${field}_rental`;

  if (preferSub) {
    return (
      pick(special?.sub) ||
      pick(subField) ||
      pick(special?.rental) ||
      pick(rentalField) ||
      (DIRECT_RECURRING_FIELDS.has(field) ? pick(field) : null)
    );
  }

  if (preferRental) {
    return (
      pick(special?.rental) ||
      pick(rentalField) ||
      pick(special?.sub) ||
      pick(subField) ||
      (DIRECT_RECURRING_FIELDS.has(field) ? pick(field) : null)
    );
  }

  if (DIRECT_RECURRING_FIELDS.has(field)) {
    const directField = pick(field);
    if (directField) return directField;
  }

  return (
    pick(special?.sub) ||
    pick(subField) ||
    pick(special?.rental) ||
    pick(rentalField) ||
    null
  );
}

function pickFamilyBaseField(row, familyKey, preferSub, preferRental) {
  const slots = SLOT_FAMILIES[familyKey] || [];
  if (!slots.length) return null;

  const withInstalledValue = slots.find((slot) => String(row[slot] || "").trim());
  if (withInstalledValue) return withInstalledValue;

  const withExistingBilling = slots.find((slot) => {
    const billingColumn = getBillingColumnForField(row, slot, preferSub, preferRental);
    if (!billingColumn) return false;
    return toNumber(row[billingColumn]) > 0;
  });
  if (withExistingBilling) return withExistingBilling;

  return slots[0];
}

function fallbackBaseFieldFromText(name, description) {
  const joined = normalizeText(`${name || ""} ${description || ""}`);
  if (joined.includes("routing")) return "software";
  if (joined.includes("roaming")) return "roaming";
  if (joined.includes("additional_data")) return "additional_data";
  if (joined.includes("sms")) return "additional_data";
  if (joined.includes("control_room")) return "controlroom";
  if (joined.includes("management_and_consultant")) return "consultancy";
  if (joined.includes("beame")) return "beame";
  if (joined.includes("sky_can")) return "sky_ican";
  if (joined.includes("skylink_pro")) return "skylink_pro";
  if (joined.includes("mtx_mc202x")) return "mtx_mc202x";
  if (joined.includes("mdvr_mini_5ch")) return "_5ch_mdvr";
  if (joined.includes("mdvr_mini_4ch")) return "_4ch_mdvr";
  if (joined.includes("mix_4000")) return "fm_unit";
  return null;
}

function mapRowToBaseField(resolveVehicleProductMapping, row, vehicleRow, preferSub, preferRental) {
  const item = {
    id: row.item_id || row.id || null,
    item_id: row.item_id || row.id || null,
    product_item_id: row.item_id || row.id || null,
    product: row.item_name || row.product || row.name || "",
    name: row.item_name || row.product || row.name || "",
    description: row.item_description || row.description || "",
    code: row.item_code || row.code || "",
    item_code: row.item_code || row.code || "",
    type: row.type || "",
    category: row.category || "",
  };

  const mapped = resolveVehicleProductMapping(item);
  if (mapped?.kind === "direct" || mapped?.kind === "grouped") {
    return mapped.field;
  }
  if (mapped?.kind === "family") {
    return pickFamilyBaseField(vehicleRow, mapped.field, preferSub, preferRental);
  }

  const fallback = fallbackBaseFieldFromText(item.name, item.description);
  if (!fallback) return null;
  if (SLOT_FAMILIES[fallback]) {
    return pickFamilyBaseField(vehicleRow, fallback, preferSub, preferRental);
  }
  return fallback;
}

function recalculateVehicleTotals(vehicle) {
  let totalRental = 0;
  let totalSub = 0;

  for (const [key, value] of Object.entries(vehicle)) {
    if (TOTAL_FIELDS.has(key)) continue;
    const amount = toNumber(value);
    if (amount <= 0) continue;

    if (key.endsWith("_rental")) {
      totalRental += amount;
      continue;
    }
    if (key.endsWith("_sub") || SERVICE_ONLY_FIELDS.has(key)) {
      totalSub += amount;
    }
  }

  return {
    total_rental: round2(totalRental),
    total_sub: round2(totalSub),
    total_rental_sub: round2(totalRental + totalSub),
  };
}

function pickBestJobCard(rows, accountNumber, invoiceNumber) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const normalizedInvoice = normalizeInvoice(invoiceNumber);
  const normalizedAccount = String(accountNumber || "").trim().toLowerCase();

  const exactInvoice = rows.find(
    (row) => normalizeInvoice(row.invoice_number) === normalizedInvoice,
  );
  if (exactInvoice) return exactInvoice;

  const accountMatch = rows.find((row) => {
    const account = String(row.new_account_number || "").trim().toLowerCase();
    return account && account === normalizedAccount;
  });
  if (accountMatch) return accountMatch;

  return [...rows].sort((a, b) => {
    const aDate = new Date(a.completion_date || a.created_at || 0).getTime();
    const bDate = new Date(b.completion_date || b.created_at || 0).getTime();
    return bDate - aDate;
  })[0];
}

async function fetchJobCardByJobNumber(supabase, cache, jobNumber, accountNumber, invoiceNumber) {
  if (cache.has(jobNumber)) {
    return pickBestJobCard(cache.get(jobNumber), accountNumber, invoiceNumber);
  }

  const { data, error } = await supabase
    .from("job_cards")
    .select(
      "id,job_number,new_account_number,customer_name,vehicle_registration,vehicle_make,vehicle_model,vehicle_year,completion_date,created_at,quotation_number",
    )
    .eq("job_number", jobNumber)
    .limit(20);

  if (error) {
    throw new Error(`Failed to fetch job card ${jobNumber}: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];
  cache.set(jobNumber, rows);
  return pickBestJobCard(rows, accountNumber, invoiceNumber);
}

function buildVehicleLookupKey(table, reg, accountNumber) {
  return `${table}|${String(reg || "").trim().toLowerCase()}|${String(accountNumber || "").trim().toLowerCase()}`;
}

async function getOrCreateVehicleRow({
  supabase,
  table,
  reg,
  accountNumber,
  customerName,
  make,
  model,
  year,
  apply,
  cache,
}) {
  const key = buildVehicleLookupKey(table, reg, accountNumber);
  if (cache.has(key)) return cache.get(key);

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .ilike("reg", reg)
    .limit(20);

  if (error) {
    throw new Error(`Failed to query ${table} for reg ${reg}: ${error.message}`);
  }

  const matching = (Array.isArray(data) ? data : []).find((row) => {
    const newAccount = String(row.new_account_number || "").trim();
    const account = String(row.account_number || "").trim();
    return newAccount === accountNumber || account === accountNumber;
  });

  if (matching) {
    cache.set(key, { row: matching, created: false });
    return { row: matching, created: false };
  }

  const virtualRow = {
    id: null,
    reg,
    company: customerName || null,
    new_account_number: accountNumber || null,
    account_number: accountNumber || null,
    make: make || null,
    model: model || null,
    year: year || null,
    total_rental: 0,
    total_sub: 0,
    total_rental_sub: 0,
  };

  if (!apply) {
    cache.set(key, { row: virtualRow, created: true });
    return { row: virtualRow, created: true };
  }

  const { id: _ignoredId, ...insertPayload } = virtualRow;

  const { data: inserted, error: insertError } = await supabase
    .from(table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError) {
    throw new Error(`Failed to insert ${table} row (${reg}): ${insertError.message}`);
  }

  cache.set(key, { row: inserted, created: true });
  return { row: inserted, created: true };
}

function groupedKeyForRow(row) {
  return [
    String(row.job_number || "").trim(),
    String(row.new_account_number || "").trim(),
    String(row.invoice_number || "").trim(),
  ].join("|");
}

async function main() {
  const args = parseArgs(process.argv);
  const env = {
    ...parseEnvFile(path.join(ROOT, ".env.local")),
    ...process.env,
  };

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment",
    );
  }

  if (!fs.existsSync(args.csv)) {
    throw new Error(`CSV not found: ${args.csv}`);
  }

  const invoiceFilter = readInvoiceFilter(args.invoiceList);
  const jobFilter = readJobFilter(args.jobList);
  const { resolveVehicleProductMapping } = await loadVehicleMappingModule();

  const rows = await readCsvRows(args.csv);
  const selectedRows = rows.filter((row) => {
    if (jobFilter.size) {
      const jobNumber = String(row.job_number || "").trim().toUpperCase();
      if (!jobNumber || !jobFilter.has(jobNumber)) {
        return false;
      }
    }
    if (!invoiceFilter.size) return true;
    const invoiceFromRow = normalizeInvoice(row.invoice_number);
    if (!invoiceFromRow) return true;
    return invoiceFilter.has(invoiceFromRow);
  });

  const recurringRows = selectedRows.filter((row) => {
    const amounts = getRecurringAmounts(row);
    return amounts.rentalAmount > 0 || amounts.subscriptionAmount > 0;
  });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const jobCardCache = new Map();
  const vehicleCache = new Map();
  const planByVehicle = new Map();
  const skips = [];

  for (const row of recurringRows) {
    const jobNumber = String(row.job_number || "").trim();
    const invoiceNumberFromRow = String(row.invoice_number || "").trim();
    const accountNumberFromRow = String(row.new_account_number || "").trim();
    const customerNameFromRow = String(row.customer_name || "").trim() || null;
    const amounts = getRecurringAmounts(row);

    if (!jobNumber) {
      skips.push({
        reason: "missing_job_or_account",
        job_number: jobNumber || null,
        invoice_number: invoiceNumberFromRow || null,
        item_name: row.item_name || null,
      });
      continue;
    }

    const jobCard = await fetchJobCardByJobNumber(
      supabase,
      jobCardCache,
      jobNumber,
      accountNumberFromRow,
      invoiceNumberFromRow,
    );

    const accountNumber = String(
      accountNumberFromRow || jobCard?.new_account_number || "",
    ).trim();
    const customerName =
      customerNameFromRow ||
      String(jobCard?.customer_name || "").trim() ||
      null;
    const effectiveInvoiceNumber = String(
      invoiceNumberFromRow || "",
    ).trim();

    if (!accountNumber) {
      skips.push({
        reason: "missing_job_or_account",
        job_number: jobNumber || null,
        invoice_number: effectiveInvoiceNumber || null,
        item_name: row.item_name || null,
      });
      continue;
    }

    if (
      invoiceFilter.size &&
      effectiveInvoiceNumber &&
      !invoiceFilter.has(normalizeInvoice(effectiveInvoiceNumber))
    ) {
      continue;
    }

    const reg =
      String(
        row.vehicle_registration ||
          jobCard?.vehicle_registration ||
          "",
      ).trim() ||
      buildTemporaryRegistration(
        jobCard?.id || "",
        jobNumber,
        jobCard?.quotation_number || "",
        accountNumber,
      );

    const make = row.vehicle_make || jobCard?.vehicle_make || null;
    const model = row.vehicle_model || jobCard?.vehicle_model || null;
    const year = row.vehicle_year || jobCard?.vehicle_year || null;
    const resolvedCustomer = customerName || accountNumber || null;

    for (const table of ["vehicles", "vehicles_duplicate"]) {
      const { row: vehicleRow, created } = await getOrCreateVehicleRow({
        supabase,
        table,
        reg,
        accountNumber,
        customerName: resolvedCustomer,
        make,
        model,
        year,
        apply: args.apply,
        cache: vehicleCache,
      });

      const planKey = buildVehicleLookupKey(table, reg, accountNumber);
      if (!planByVehicle.has(planKey)) {
        planByVehicle.set(planKey, {
          table,
          reg,
          accountNumber,
          customerName: resolvedCustomer,
          rowId: vehicleRow.id,
          created,
          sourceGroups: new Set(),
          updates: {},
          workingRow: { ...vehicleRow },
          totalsDelta: { rental: 0, sub: 0 },
        });
      }

      const plan = planByVehicle.get(planKey);
      plan.sourceGroups.add(groupedKeyForRow(row));

      const chargeSpecs = [
        {
          amount: amounts.subscriptionAmount,
          preferSub: true,
          preferRental: false,
          chargeLabel: "subscription",
        },
        {
          amount: amounts.rentalAmount,
          preferSub: false,
          preferRental: true,
          chargeLabel: "rental",
        },
      ].filter((spec) => spec.amount > 0);

      for (const spec of chargeSpecs) {
        const baseField = mapRowToBaseField(
          resolveVehicleProductMapping,
          row,
          plan.workingRow,
          spec.preferSub,
          spec.preferRental,
        );

        if (!baseField) {
          skips.push({
            reason: "unmapped_item",
            table,
            job_number: jobNumber,
            invoice_number: effectiveInvoiceNumber,
            account_number: accountNumber,
            reg,
            item_id: row.item_id || null,
            item_name: row.item_name || null,
            charge: spec.chargeLabel,
            amount: spec.amount,
          });
          continue;
        }

        const billingColumn = getBillingColumnForField(
          plan.workingRow,
          baseField,
          spec.preferSub,
          spec.preferRental,
        );

        if (!billingColumn) {
          skips.push({
            reason: "no_billing_column",
            table,
            job_number: jobNumber,
            invoice_number: effectiveInvoiceNumber,
            account_number: accountNumber,
            reg,
            item_id: row.item_id || null,
            item_name: row.item_name || null,
            base_field: baseField,
            charge: spec.chargeLabel,
            amount: spec.amount,
          });
          continue;
        }

        const previous = toNumber(plan.workingRow[billingColumn]);
        const next = round2(previous + spec.amount);
        plan.workingRow[billingColumn] = next;
        plan.updates[billingColumn] = next;

        if (billingColumn.endsWith("_rental")) {
          plan.totalsDelta.rental = round2(plan.totalsDelta.rental + spec.amount);
        } else if (
          billingColumn.endsWith("_sub") ||
          SERVICE_ONLY_FIELDS.has(billingColumn)
        ) {
          plan.totalsDelta.sub = round2(plan.totalsDelta.sub + spec.amount);
        }
      }
    }
  }

  const plans = Array.from(planByVehicle.values());
  let updatedRows = 0;
  let createdRows = 0;

  for (const plan of plans) {
    if (!Object.keys(plan.updates).length) continue;

    const totals = recalculateVehicleTotals({
      ...plan.workingRow,
      ...plan.updates,
    });

    const payload = {
      ...plan.updates,
      ...totals,
    };

    if (args.apply) {
      if (!plan.rowId) {
        throw new Error(
          `Cannot update ${plan.table} without row id (reg=${plan.reg}, account=${plan.accountNumber})`,
        );
      }

      const { error } = await supabase
        .from(plan.table)
        .update(payload)
        .eq("id", plan.rowId);

      if (error) {
        throw new Error(
          `Failed update ${plan.table} id=${plan.rowId}: ${error.message}`,
        );
      }
    }

    updatedRows += 1;
    if (plan.created) createdRows += 1;
  }

  const summary = {
    mode: args.apply ? "apply" : "dry-run",
    csv: args.csv,
    invoice_filter_size: invoiceFilter.size,
    job_filter_size: jobFilter.size,
    source_rows: rows.length,
    selected_rows: selectedRows.length,
    recurring_rows: recurringRows.length,
    vehicle_plans: plans.length,
    updated_rows: updatedRows,
    created_rows: createdRows,
    skipped_rows: skips.length,
  };

  const outDir = path.join(ROOT, "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `vehicles-recurring-backfill-${args.apply ? "apply" : "dry-run"}-${Date.now()}.json`,
  );
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        summary,
        skips,
        preview: plans.slice(0, 100).map((plan) => ({
          table: plan.table,
          reg: plan.reg,
          account_number: plan.accountNumber,
          row_id: plan.rowId,
          created: plan.created,
          source_groups: Array.from(plan.sourceGroups),
          updates: plan.updates,
          totals_delta: plan.totalsDelta,
        })),
      },
      null,
      2,
    ),
  );

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Report written to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
