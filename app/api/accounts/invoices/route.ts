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
    const limit = Math.min(
      Math.max(Number.parseInt(String(searchParams.get("limit") || "100"), 10) || 100, 1),
      500,
    );

    let query = supabase
      .from("account_invoices")
      .select(
        "id, account_number, billing_month, invoice_number, invoice_date, total_amount, paid_amount, balance_due, payment_status, company_name, customer_vat_number, company_registration_number, client_address, line_items, notes, created_at",
      )
      .order("invoice_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      query = query.or(
        `invoice_number.ilike.%${escaped}%,account_number.ilike.%${escaped}%,company_name.ilike.%${escaped}%`,
      );
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error("Failed to fetch account invoices:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch invoices" },
        { status: 500 },
      );
    }

    const rows = Array.isArray(invoices) ? invoices : [];
    const accountNumbers = Array.from(
      new Set(
        rows
          .map((invoice) => String(invoice?.account_number || "").trim())
          .filter(Boolean),
      ),
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
        console.error("Failed to fetch cost center invoice metadata:", costCentersError);
      } else {
        costCentersByCode = new Map(
          (Array.isArray(costCenters) ? costCenters : []).map((row) => [
            String(row?.cost_code || "").trim().toUpperCase(),
            row,
          ]),
        );
      }
    }

    const invoicesWithCustomerInfo = rows.map((invoice) => {
      const accountNumber = String(invoice?.account_number || "").trim();
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
        ...invoice,
        company_name:
          String(costCenter?.company || "").trim() ||
          String(costCenter?.legal_name || "").trim() ||
          String(invoice?.company_name || "").trim() ||
          null,
        customer_vat_number:
          String(costCenter?.vat_number || "").trim() ||
          String(invoice?.customer_vat_number || "").trim() ||
          null,
        company_registration_number:
          String(costCenter?.registration_number || "").trim() ||
          String(invoice?.company_registration_number || "").trim() ||
          null,
        client_address:
          costCenterAddress || String(invoice?.client_address || "").trim() || null,
      };
    });

    return NextResponse.json({ invoices: invoicesWithCustomerInfo });
  } catch (error) {
    console.error("Unexpected error in accounts invoices GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
