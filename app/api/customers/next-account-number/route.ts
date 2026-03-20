import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  allocateNewCustomerAccountNumber,
  buildAccountPreview,
} from "@/lib/server/account-number";

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
    const company = (searchParams.get("company") || "").trim();

    if (!company) {
      return NextResponse.json({
        success: true,
        account_number: "",
        preview: "",
      });
    }

    const accountNumber = await allocateNewCustomerAccountNumber(
      supabase,
      company,
    );

    return NextResponse.json({
      success: true,
      account_number: accountNumber,
      preview: buildAccountPreview(company),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to allocate account number",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
