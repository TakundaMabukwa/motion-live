import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function buildClientPrefix(companyName = "") {
  const normalized = companyName.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!normalized) {
    return "COST";
  }

  return normalized.slice(0, 4).padEnd(4, "X");
}

function extractMatchingCodes(allCodes = "", prefix = "") {
  return allCodes
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.startsWith(`${prefix}-`));
}

async function attachLockedByEmails(supabase, rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return rows || [];

  const userIds = [
    ...new Set(
      rows
        .map((row) => row?.total_amount_locked_by)
        .filter((value) => typeof value === "string" && value.trim().length > 0),
    ),
  ];

  if (userIds.length === 0) {
    return rows.map((row) => ({
      ...row,
      total_amount_locked_by_email: null,
    }));
  }

  const { data: userRows, error } = await supabase
    .from("users")
    .select("id, email")
    .in("id", userIds);

  if (error) {
    console.error("Error fetching lock owner emails:", error);
    return rows.map((row) => ({
      ...row,
      total_amount_locked_by_email: null,
    }));
  }

  const emailMap = Object.fromEntries(
    (userRows || []).map((user) => [user.id, user.email || null]),
  );

  return rows.map((row) => ({
    ...row,
    total_amount_locked_by_email: row?.total_amount_locked_by
      ? emailMap[row.total_amount_locked_by] || null
      : null,
  }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accounts = searchParams.get("accounts");
    const prefix = searchParams.get("prefix");
    const all = searchParams.get("all");

    if (!accounts && !prefix && all !== "1") {
      return NextResponse.json(
        { error: "Account numbers, prefix, or all=1 required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    if (all === "1") {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("id, created_at, company, cost_code, validated, total_amount_locked, total_amount_locked_value, total_amount_locked_by, total_amount_locked_at")
        .order("cost_code", { ascending: true });

      if (error) {
        console.error("Error fetching all cost centers:", error);
        return NextResponse.json(
          { error: "Failed to fetch cost centers", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json(await attachLockedByEmails(supabase, data || []));
    }

    // Prefix mode: fetch all cost centers for a client prefix like EDGE-
    if (prefix) {
      const cleanPrefix = prefix.trim().replace(/-+$/, "");
      if (!cleanPrefix) {
        return NextResponse.json([], { status: 200 });
      }

      const { data, error } = await supabase
        .from("cost_centers")
        .select("id, created_at, company, cost_code, validated, total_amount_locked, total_amount_locked_value, total_amount_locked_by, total_amount_locked_at")
        .ilike("cost_code", `${cleanPrefix}-%`)
        .order("cost_code", { ascending: true });

      if (error) {
        console.error("Error fetching cost centers by prefix:", error);
        return NextResponse.json(
          { error: "Failed to fetch cost centers", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json(await attachLockedByEmails(supabase, data || []));
    }

    // Parse comma-separated account numbers
    const accountArray = accounts
      .split(",")
      .map((a) => a.trim().toUpperCase())
      .filter((a) => a);
    console.log("Fetching cost centers for accounts:", accountArray);

    // Fetch from cost_centers table where cost_code matches any account number
    const { data, error } = await supabase
      .from("cost_centers")
      .select("id, created_at, company, cost_code, validated, total_amount_locked, total_amount_locked_value, total_amount_locked_by, total_amount_locked_at")
      .in("cost_code", accountArray)
      .order("cost_code", { ascending: true });

    // If cost_centers table doesn't have data, try fetching distinct cost_code from customers_grouped
    if ((!data || data.length === 0) && accountArray.length > 0) {
      console.log("No cost centers found, checking customers_grouped");
      const { data: customerData } = await supabase
        .from("customers_grouped")
        .select("cost_code")
        .in("all_new_account_numbers", accountArray);
      if (customerData && customerData.length > 0) {
        // Get unique cost codes
        const uniqueCostCodes = [
          ...new Set(
            customerData.map((c) => c.cost_code).filter((code) => code),
          ),
        ];

        // Try to fetch validated status from cost_centers table
        const { data: ccData } = await supabase
          .from("cost_centers")
          .select("cost_code, validated, total_amount_locked, total_amount_locked_value, total_amount_locked_by, total_amount_locked_at")
          .in("cost_code", uniqueCostCodes);

        const validatedMap = {};
        if (ccData) {
          ccData.forEach((cc) => {
            validatedMap[cc.cost_code] = {
              validated: cc.validated || false,
              total_amount_locked: cc.total_amount_locked || false,
              total_amount_locked_value: cc.total_amount_locked_value || null,
              total_amount_locked_by: cc.total_amount_locked_by || null,
              total_amount_locked_at: cc.total_amount_locked_at || null,
            };
          });
        }

        const costCodes = uniqueCostCodes.map((code) => ({
          cost_code: code,
          company: "",
          id: null,
          created_at: null,
          validated: validatedMap[code]?.validated || false,
          total_amount_locked: validatedMap[code]?.total_amount_locked || false,
          total_amount_locked_value: validatedMap[code]?.total_amount_locked_value || null,
          total_amount_locked_by: validatedMap[code]?.total_amount_locked_by || null,
          total_amount_locked_at: validatedMap[code]?.total_amount_locked_at || null,
        }));
        console.log("Cost codes from customers_grouped:", costCodes);
        return NextResponse.json(await attachLockedByEmails(supabase, costCodes));
      }
    }

    if (error) {
      console.error("Error fetching cost centers:", error);
      return NextResponse.json(
        { error: "Failed to fetch cost centers", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(await attachLockedByEmails(supabase, data || []));
  } catch (e) {
    return NextResponse.json(
      { error: "Unexpected error", details: e.message },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const company = (body?.company || "").toString().trim();
    const prefixSource = (body?.prefix_source || body?.client_name || company)
      .toString()
      .trim();
    const customersGroupedId = (body?.customers_grouped_id || "")
      .toString()
      .trim();
    const explicitCostCode = (body?.cost_code || "")
      .toString()
      .trim()
      .toUpperCase();

    if (!company) {
      return NextResponse.json(
        { error: "company is required" },
        { status: 400 },
      );
    }

    if (!prefixSource) {
      return NextResponse.json(
        {
          error:
            "prefix_source is required when company is not suitable for code generation",
        },
        { status: 400 },
      );
    }

    const prefix = buildClientPrefix(prefixSource);

    const groupedQuery = customersGroupedId
      ? supabase
          .from("customers_grouped")
          .select("id, company_group, all_new_account_numbers")
          .eq("id", customersGroupedId)
          .limit(1)
      : supabase
          .from("customers_grouped")
          .select("id, company_group, all_new_account_numbers")
          .eq("company_group", prefixSource)
          .limit(1);

    const [
      { data: existingCenters, error: centersError },
      { data: groupedRows, error: groupedError },
    ] = await Promise.all([
      supabase
        .from("cost_centers")
        .select("cost_code")
        .ilike("cost_code", `${prefix}-%`),
      groupedQuery,
    ]);

    if (centersError) {
      return NextResponse.json(
        {
          error: "Failed to inspect existing cost centers",
          details: centersError.message,
        },
        { status: 500 },
      );
    }

    if (groupedError) {
      return NextResponse.json(
        {
          error: "Failed to inspect grouped customer accounts",
          details: groupedError.message,
        },
        { status: 500 },
      );
    }

    const groupedRow = groupedRows?.[0] || null;
    const codesFromCenters = (existingCenters || [])
      .map((row) => row.cost_code?.toString().trim().toUpperCase())
      .filter(Boolean);
    const codesFromGrouped = extractMatchingCodes(
      groupedRow?.all_new_account_numbers || "",
      prefix,
    );
    const existingCodes = [
      ...new Set([...codesFromCenters, ...codesFromGrouped]),
    ];

    const nextSequence =
      existingCodes.reduce((max, code) => {
        const match = code.match(/-(\d{4,})$/);
        const current = match ? parseInt(match[1], 10) : 0;
        return Math.max(max, current);
      }, 0) + 1;

    const generatedCostCode = `${prefix}-${nextSequence.toString().padStart(4, "0")}`;
    const costCode = explicitCostCode || generatedCostCode;

    if (explicitCostCode) {
      const { data: duplicateCostCenter, error: duplicateError } =
        await supabase
          .from("cost_centers")
          .select("id")
          .eq("cost_code", explicitCostCode)
          .maybeSingle();

      if (duplicateError) {
        return NextResponse.json(
          {
            error: "Failed to validate provided cost code",
            details: duplicateError.message,
          },
          { status: 500 },
        );
      }

      if (duplicateCostCenter) {
        return NextResponse.json(
          { error: `Cost center ${explicitCostCode} already exists` },
          { status: 409 },
        );
      }
    }

    const { data: insertedCenter, error: insertError } = await supabase
      .from("cost_centers")
      .insert([
        {
          company,
          cost_code: costCode,
          validated: false,
        },
      ])
      .select("id, created_at, company, cost_code, validated, total_amount_locked, total_amount_locked_value, total_amount_locked_by, total_amount_locked_at")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create cost center", details: insertError.message },
        { status: 500 },
      );
    }

    const updatedCodes = [...new Set([...existingCodes, costCode])];

    if (groupedRow?.id) {
      const { error: updateGroupedError } = await supabase
        .from("customers_grouped")
        .update({
          all_new_account_numbers: updatedCodes.join(","),
          cost_code: costCode,
        })
        .eq("id", groupedRow.id);

      if (updateGroupedError) {
        return NextResponse.json(
          {
            error:
              "Cost center created, but failed to update grouped customer accounts",
            details: updateGroupedError.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      costCenter: insertedCenter,
      all_new_account_numbers: updatedCodes.join(","),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Unexpected error", details: e.message },
      { status: 500 },
    );
  }
}

