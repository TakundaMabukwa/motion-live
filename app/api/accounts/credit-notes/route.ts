import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const normalizeSearch = (value: unknown) => String(value || "").trim();

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
    const search = normalizeSearch(searchParams.get("search"));
    const fetchAll = ["1", "true", "yes"].includes(
      String(searchParams.get("all") || "").trim().toLowerCase(),
    );
    const limit = Math.min(
      Math.max(Number.parseInt(String(searchParams.get("limit") || "100"), 10) || 100, 1),
      5000,
    );

    let query = supabase
      .from("credit_notes")
      .select(
        "id, credit_note_number, account_number, billing_month_applies_to, credit_note_date, amount, applied_amount, unapplied_amount, status, reference, comment, reason, created_at",
      )
      .order("credit_note_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    query = fetchAll ? query.range(0, 9999) : query.limit(limit);

    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      query = query.or(
        `credit_note_number.ilike.%${escaped}%,account_number.ilike.%${escaped}%,reference.ilike.%${escaped}%,comment.ilike.%${escaped}%,reason.ilike.%${escaped}%`,
      );
    }

    const { data: creditNotes, error } = await query;

    if (error) {
      console.error("Failed to fetch account credit notes:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch credit notes" },
        { status: 500 },
      );
    }

    const rows = Array.isArray(creditNotes) ? creditNotes : [];
    const accountNumbers = Array.from(
      new Set(rows.map((row) => String(row?.account_number || "").trim()).filter(Boolean)),
    );

    let costCentersByCode = new Map<string, Record<string, unknown>>();
    if (accountNumbers.length > 0) {
      const { data: costCenters, error: costCentersError } = await supabase
        .from("cost_centers")
        .select(
          "cost_code, company, legal_name, vat_number, registration_number, physical_address_1, physical_address_2, physical_address_3, physical_area, physical_province, physical_code",
        )
        .in("cost_code", accountNumbers);

      if (costCentersError) {
        console.error("Failed to fetch cost center credit note metadata:", costCentersError);
      } else {
        costCentersByCode = new Map(
          (Array.isArray(costCenters) ? costCenters : []).map((row) => [
            String(row?.cost_code || "").trim().toUpperCase(),
            row,
          ]),
        );
      }
    }

    const notesWithCustomerInfo = rows.map((row) => {
      const accountNumber = String(row?.account_number || "").trim();
      const costCenter = costCentersByCode.get(accountNumber.toUpperCase()) || null;
      const costCenterAddress = [
        costCenter?.physical_address_1,
        costCenter?.physical_address_2,
        costCenter?.physical_address_3,
        costCenter?.physical_area,
        costCenter?.physical_province,
        costCenter?.physical_code,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join("\n");

      return {
        ...row,
        company_name:
          String(costCenter?.company || "").trim() ||
          String(costCenter?.legal_name || "").trim() ||
          null,
        customer_vat_number: String(costCenter?.vat_number || "").trim() || null,
        company_registration_number:
          String(costCenter?.registration_number || "").trim() || null,
        client_address: costCenterAddress || null,
      };
    });

    return NextResponse.json({ creditNotes: notesWithCustomerInfo });
  } catch (error) {
    console.error("Unexpected error in accounts credit notes GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
