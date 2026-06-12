import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reg, fleet_number, account_number } = body;

    let resolvedAccountNumber = account_number || null;

    // If no account_number provided, find vehicle first
    if (!resolvedAccountNumber && (reg || fleet_number)) {
      const filters: string[] = [];
      if (reg) {
        filters.push(`reg.ilike.%${reg}%`);
        filters.push(`fleet_number.ilike.%${reg}%`);
      }
      if (fleet_number) {
        filters.push(`reg.ilike.%${fleet_number}%`);
        filters.push(`fleet_number.ilike.%${fleet_number}%`);
      }

      const { data: vehicleRows, error: vehicleError } = await supabase
        .from("vehicles_duplicate")
        .select("new_account_number, company")
        .or(filters.join(","))
        .limit(5);

      if (!vehicleError && vehicleRows?.length) {
        const match = vehicleRows.find((v) => String(v.new_account_number || "").trim());
        if (match) {
          resolvedAccountNumber = String(match.new_account_number).trim();
        }
      }
    }

    // Lookup cost center if we have an account number
    let costCenter = null;
    if (resolvedAccountNumber) {
      const { data: ccRows, error: ccError } = await supabase
        .from("cost_centers")
        .select("*")
        .ilike("cost_code", resolvedAccountNumber)
        .limit(1);

      if (!ccError && ccRows?.length) {
        costCenter = ccRows[0];
      }
    }

    return NextResponse.json({
      found: Boolean(costCenter),
      account_number: resolvedAccountNumber,
      cost_center: costCenter,
    });
  } catch (error) {
    console.error("Error in vehicle-cost-center lookup:", error);
    return NextResponse.json(
      { found: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
