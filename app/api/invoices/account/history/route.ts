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
    const accountNumber = String(searchParams.get("accountNumber") || "").trim();

    if (!accountNumber) {
      return NextResponse.json(
        { error: "accountNumber is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("account_invoices")
      .select("id, account_number, billing_month, invoice_number, invoice_date, total_amount, notes, created_at")
      .eq("account_number", accountNumber)
      .order("billing_month", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch account invoice history:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch account invoice history" },
        { status: 500 },
      );
    }

    return NextResponse.json({ invoices: data || [] });
  } catch (error) {
    console.error("Unexpected error in account invoice history GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
