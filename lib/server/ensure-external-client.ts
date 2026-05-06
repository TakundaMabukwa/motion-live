import { buildTemporaryRegistration } from "@/lib/temp-registration";

function extractMissingColumnName(message?: string | null): string | null {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function buildCostCodePrefix(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const prefix = cleaned.slice(0, 4);
  return (prefix || "CLNT").padEnd(4, "X");
}

function appendCommaValue(existing: unknown, nextValue: string) {
  const values = String(existing || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!values.includes(nextValue)) {
    values.push(nextValue);
  }

  return values.join(",");
}

async function tolerantInsertSingle(
  supabase: any,
  table: string,
  payload: Record<string, unknown>,
) {
  const insertPayload = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await supabase
      .from(table)
      .insert([insertPayload])
      .select("*")
      .single();

    if (!result.error) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.error.message);
    if (
      result.error.code === "PGRST204" &&
      missingColumn &&
      Object.prototype.hasOwnProperty.call(insertPayload, missingColumn)
    ) {
      delete insertPayload[missingColumn];
      continue;
    }

    return result;
  }

  return { data: null, error: { message: "Insert failed after retries" } };
}

async function tolerantUpdateWhere(
  supabase: any,
  table: string,
  payload: Record<string, unknown>,
  column: string,
  value: unknown,
) {
  const updatePayload = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await supabase
      .from(table)
      .update(updatePayload)
      .eq(column, value)
      .select("*");

    if (!result.error) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.error.message);
    if (
      result.error.code === "PGRST204" &&
      missingColumn &&
      Object.prototype.hasOwnProperty.call(updatePayload, missingColumn)
    ) {
      delete updatePayload[missingColumn];
      continue;
    }

    return result;
  }

  return { data: null, error: { message: "Update failed after retries" } };
}

async function findExistingCostCode(supabase: any, costCode: string) {
  const { data, error } = await supabase
    .from("cost_centers")
    .select("*")
    .ilike("cost_code", costCode)
    .limit(1);

  if (error) {
    throw new Error(`Failed to read cost center: ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0] || null;
}

async function allocateCostCode(supabase: any, clientName: string) {
  const prefix = buildCostCodePrefix(clientName);
  const { data, error } = await supabase
    .from("cost_centers")
    .select("cost_code")
    .ilike("cost_code", `${prefix}-%`);

  if (error) {
    throw new Error(`Failed to allocate cost code: ${error.message}`);
  }

  const maxSuffix = (data || []).reduce((max: number, row: Record<string, any>) => {
    const match = String(row?.cost_code || "").match(/-(\d{4})$/);
    const suffix = match ? Number(match[1]) : 0;
    return Number.isFinite(suffix) && suffix > max ? suffix : max;
  }, 0);

  return `${prefix}-${String(maxSuffix + 1).padStart(4, "0")}`;
}

export async function ensureExternalClientSetup(
  supabase: any,
  input: Record<string, any>,
) {
  const customerName =
    normalizeText(input.customerName || input.customer_name) ||
    normalizeText(input.company) ||
    normalizeText(input.legal_name) ||
    normalizeText(input.trading_name);

  if (!customerName) {
    throw new Error("Customer name is required to create a new external client");
  }

  const providedAccountNumber = normalizeText(
    input.new_account_number || input.accountNumber || input.account_number,
  );

  if (providedAccountNumber) {
    const existingCostCenter = await findExistingCostCode(
      supabase,
      providedAccountNumber,
    );
    if (existingCostCenter) {
      return {
        costCode: existingCostCenter.cost_code,
        created: false,
      };
    }
  }

  const costCode = await allocateCostCode(supabase, customerName);
  const legalName = normalizeText(input.legal_name || customerName);
  const tradingName = normalizeText(input.trading_name || customerName);
  const email = normalizeText(input.customerEmail || input.customer_email || input.email);
  const phone = normalizeText(input.customerPhone || input.customer_phone || input.cell_no);
  const address = normalizeText(input.customerAddress || input.customer_address);
  const registration = normalizeText(input.registration_number);
  const vatNumber = normalizeText(input.vat_number);
  const postalAddress = normalizeText(input.postal_address_1);

  const customerPayload = {
    account_number: costCode,
    new_account_number: costCode,
    company: customerName,
    legal_name: legalName || null,
    trading_name: tradingName || customerName,
    email: email || null,
    cell_no: phone || null,
    switchboard: phone || null,
    vat_number: vatNumber || null,
    registration_number: registration || null,
    physical_address_1: address || null,
    postal_address_1: postalAddress || address || null,
    date_added: new Date().toISOString(),
    date_modified: new Date().toISOString(),
  };

  const { error: customerError } = await tolerantInsertSingle(
    supabase,
    "customers",
    customerPayload,
  );

  if (customerError) {
    throw new Error(`Failed to create customer: ${customerError.message}`);
  }

  const { data: existingGroup } = await supabase
    .from("customers_grouped")
    .select("*")
    .eq("company_group", customerName)
    .maybeSingle();

  if (existingGroup) {
    const updatePayload = {
      all_account_numbers: appendCommaValue(
        existingGroup.all_account_numbers,
        costCode,
      ),
      all_new_account_numbers: appendCommaValue(
        existingGroup.all_new_account_numbers,
        costCode,
      ),
      legal_names: existingGroup.legal_names || legalName || null,
      cost_code: existingGroup.cost_code || costCode,
    };

    const { error: groupedUpdateError } = await supabase
      .from("customers_grouped")
      .update(updatePayload)
      .eq("id", existingGroup.id);

    if (groupedUpdateError) {
      throw new Error(
        `Failed to update customers_grouped: ${groupedUpdateError.message}`,
      );
    }
  } else {
    const { error: groupedInsertError } = await supabase
      .from("customers_grouped")
      .insert([
        {
          company_group: customerName,
          legal_names: legalName || null,
          all_account_numbers: costCode,
          all_new_account_numbers: costCode,
          cost_code: costCode,
          validate: false,
          contact_details: {
            email: email || null,
            phone: phone || null,
            address: address || null,
          },
        },
      ]);

    if (groupedInsertError) {
      throw new Error(
        `Failed to create customers_grouped: ${groupedInsertError.message}`,
      );
    }
  }

  const costCenterPayload = {
    company: customerName,
    cost_code: costCode,
    validated: false,
    legal_name: legalName || null,
    contact_name: normalizeText(input.contactPerson || input.contact_person) || null,
    vat_number: vatNumber || null,
    email: email || null,
    registration_number: registration || null,
    physical_address_1: address || null,
    physical_address_2: normalizeText(input.physical_address_2) || null,
    physical_address_3: normalizeText(input.physical_address_3) || null,
    physical_area: normalizeText(input.physical_area) || null,
    physical_code: normalizeText(input.physical_code) || null,
    postal_address_1: postalAddress || address || null,
    postal_address_2: normalizeText(input.postal_address_2) || null,
    postal_address_3: normalizeText(input.postal_address_3) || null,
    client_info_matched_at: new Date().toISOString(),
    client_info_match_score: 1,
    client_info_match_source: "external_quote_created",
  };

  // Some environments do not have a unique constraint on cost_centers.cost_code,
  // so ON CONFLICT upsert fails. Use update-by-cost_code and fallback insert.
  const { data: updatedCostCenters, error: costCenterUpdateError } =
    await tolerantUpdateWhere(
      supabase,
      "cost_centers",
      costCenterPayload,
      "cost_code",
      costCode,
    );

  if (costCenterUpdateError) {
    throw new Error(
      `Failed to update existing cost center: ${costCenterUpdateError.message}`,
    );
  }

  if (!Array.isArray(updatedCostCenters) || updatedCostCenters.length === 0) {
    const { error: costCenterInsertError } = await tolerantInsertSingle(
      supabase,
      "cost_centers",
      costCenterPayload,
    );

    if (costCenterInsertError) {
      throw new Error(
        `Failed to create cost center: ${costCenterInsertError.message}`,
      );
    }
  }

  const vehicleReg =
    normalizeText(input.vehicle_registration || input.vehicleRegistration) ||
    buildTemporaryRegistration(
      costCode,
      customerName,
      input.job_number || input.jobNumber,
    );

  const { data: existingVehicle } = await supabase
    .from("vehicles")
    .select("id")
    .ilike("reg", vehicleReg)
    .eq("new_account_number", costCode)
    .maybeSingle();

  if (!existingVehicle) {
    const vehiclePayload = {
      company: customerName,
      new_account_number: costCode,
      account_number: costCode,
      reg: vehicleReg,
      make: normalizeText(input.vehicle_make || input.vehicleMake) || null,
      model: normalizeText(input.vehicle_model || input.vehicleModel) || null,
      year: normalizeText(input.vehicle_year || input.vehicleYear) || null,
      vin: normalizeText(input.vin_number || input.vin_numer || input.vinNumber) || null,
      total_rental: 0,
      total_sub: 0,
      total_rental_sub: 0,
      vehicle_validated: false,
      once_off_fees: [],
    };

    const { error: vehicleError } = await tolerantInsertSingle(
      supabase,
      "vehicles",
      vehiclePayload,
    );

    if (vehicleError) {
      throw new Error(`Failed to create vehicle: ${vehicleError.message}`);
    }
  }

  return {
    costCode,
    created: true,
  };
}
