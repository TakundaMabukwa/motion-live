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
    const { reg, fleet_number } = body;

    if (!reg && !fleet_number) {
      return NextResponse.json({
        found: false,
        error: "Either reg or fleet_number is required",
      });
    }

    const filters = new Set<string>();
    const seen = new Set<string>();

    for (const value of [reg, fleet_number]) {
      const v = String(value || "").trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      filters.add(`reg.ilike.%${v}%`);
      filters.add(`fleet_number.ilike.%${v}%`);
    }

    const { data: results, error } = await supabase
      .from("vehicles_duplicate")
      .select("new_account_number, company")
      .or(Array.from(filters).join(","))
      .limit(5);

    if (error) {
      return NextResponse.json({ found: false, error: error.message }, { status: 500 });
    }

    if (!results || results.length === 0) {
      return NextResponse.json({ found: false });
    }

    const match = results.find((v) => String(v.new_account_number || "").trim());
    if (!match) {
      const anyMatch = results[0];
      return NextResponse.json({
        found: true,
        new_account_number: anyMatch.new_account_number || null,
        company: anyMatch.company || null,
      });
    }

    return NextResponse.json({
      found: true,
      new_account_number: match.new_account_number,
      company: match.company || null,
    });
  } catch (error) {
    console.error("Error finding vehicle account:", error);
    return NextResponse.json(
      { found: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
