import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uniqueId = searchParams.get("unique_id");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!uniqueId) {
      return NextResponse.json(
        { error: "unique_id is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch one extra to know if there are more
    const { data, error } = await supabase
      .from("vehicle_history")
      .select("id, created_at, vehicle_unique_id, reg, fleet_number, new_account_number, operation, changed_by, changed_fields")
      .eq("vehicle_unique_id", uniqueId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    if (error) {
      console.error("Error fetching vehicle history:", error);
      return NextResponse.json(
        { error: "Failed to fetch history", details: error.message },
        { status: 500 },
      );
    }

    const rows = data || [];
    const hasMore = rows.length > limit;
    const history = hasMore ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      history,
      hasMore,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in vehicle history GET:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch history", details: errMsg },
      { status: 500 },
    );
  }
}
