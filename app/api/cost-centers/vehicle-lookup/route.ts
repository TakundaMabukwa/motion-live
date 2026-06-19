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

    return NextResponse.json({
      found: Boolean(resolvedAccountNumber),
      account_number: resolvedAccountNumber,
    });
  } catch (error) {
    console.error("Error in vehicle lookup:", error);
    return NextResponse.json(
      { found: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
