import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobNumber = String(searchParams.get("job_number") || "").trim();

    if (!jobNumber) {
      return NextResponse.json({ error: "job_number is required" }, { status: 400 });
    }

    const { data: jobCard, error } = await supabase
      .from("job_cards")
      .select("order_number")
      .eq("job_number", jobNumber)
      .maybeSingle();

    if (error) {
      console.error("Error fetching job card order_number:", error);
      return NextResponse.json({ error: "Failed to fetch order number" }, { status: 500 });
    }

    return NextResponse.json({ order_number: jobCard?.order_number || null });
  } catch (error) {
    console.error("Unexpected error in order-number lookup:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
