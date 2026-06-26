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
    const invoiceNumber = String(searchParams.get("invoice_number") || "").trim();

    if (!invoiceNumber) {
      return NextResponse.json({ error: "invoice_number query parameter is required" }, { status: 400 });
    }

    const upperIn = invoiceNumber.toUpperCase();

    const { data: accountInvoices, error: accountError } = await supabase
      .from("account_invoices_duplicate")
      .select("*")
      .ilike("invoice_number", `%${upperIn}%`)
      .range(0, 50);

    if (accountError) {
      console.error("Failed to search account_invoices_duplicate:", accountError);
    }

    const { data: jobInvoices, error: jobError } = await supabase
      .from("invoices")
      .select("id, job_card_id, job_number, account_number, invoice_number, invoice_date, total_amount, client_name, client_address, line_items, notes, created_at, created_by")
      .ilike("invoice_number", `%${upperIn}%`)
      .range(0, 50);

    if (jobError) {
      console.error("Failed to search invoices:", jobError);
    }

    const results: Record<string, unknown>[] = [];

    const seenInvoiceNumbers = new Set<string>();

    if (Array.isArray(accountInvoices)) {
      for (const row of accountInvoices) {
        const invNum = String(row?.invoice_number || "").trim().toUpperCase();
        if (invNum && seenInvoiceNumbers.has(invNum)) continue;
        if (invNum) seenInvoiceNumbers.add(invNum);

        results.push({
          id: String(row?.id || ""),
          account_number: String(row?.account_number || "").trim(),
          billing_month: row?.billing_month || null,
          invoice_number: String(row?.invoice_number || "").trim() || null,
          invoice_date: String(row?.invoice_date || "").trim() || null,
          total_amount: Number(row?.total_amount || 0),
          paid_amount: Number(row?.paid_amount || 0),
          balance_due: Number(row?.balance_due || 0),
          payment_status: String(row?.payment_status || "pending").trim(),
          company_name: String(row?.company_name || "").trim() || null,
          customer_vat_number: String(row?.customer_vat_number || "").trim() || null,
          company_registration_number: String(row?.company_registration_number || "").trim() || null,
          client_address: String(row?.client_address || "").trim() || null,
          line_items: Array.isArray(row?.line_items) ? row.line_items : [],
          notes: String(row?.notes || "").trim() || null,
          created_at: String(row?.created_at || "").trim() || null,
          created_by: String(row?.created_by || "").trim() || null,
          source_type: "account_invoice",
          order_number: null,
          job_card_id: null,
          job_number: null,
          created_by_name: null,
        });
      }
    }

    if (Array.isArray(jobInvoices)) {
      const jcIds = jobInvoices.map((inv) => String(inv?.job_card_id || "").trim()).filter(Boolean);

      let orderNumberByJcId = new Map<string, string | null>();
      if (jcIds.length > 0) {
        const { data: jobCards } = await supabase
          .from("job_cards")
          .select("id, order_number, new_account_number")
          .in("id", jcIds);
        if (Array.isArray(jobCards)) {
          orderNumberByJcId = new Map(
            jobCards.map((jc) => [String(jc.id), jc.order_number || null]),
          );
        }
      }

      for (const inv of jobInvoices) {
        const invNum = String(inv?.invoice_number || "").trim().toUpperCase();
        if (invNum && seenInvoiceNumbers.has(invNum)) continue;
        if (invNum) seenInvoiceNumbers.add(invNum);

        const jcId = String(inv?.job_card_id || "").trim();
        results.push({
          id: `job-card-${String(inv?.id || "").trim()}`,
          account_number: String(inv?.account_number || "").trim() || null,
          billing_month: null,
          invoice_number: String(inv?.invoice_number || "").trim() || null,
          invoice_date: String(inv?.invoice_date || "").trim() || null,
          total_amount: Number(inv?.total_amount || 0),
          paid_amount: 0,
          balance_due: Number(inv?.total_amount || 0),
          payment_status: "pending",
          company_name: String(inv?.client_name || "").trim() || null,
          customer_vat_number: null,
          company_registration_number: null,
          client_address: String(inv?.client_address || "").trim() || null,
          line_items: Array.isArray(inv?.line_items) ? inv.line_items : [],
          notes: String(inv?.notes || "").trim() || null,
          created_at: String(inv?.created_at || "").trim() || null,
          created_by: String(inv?.created_by || "").trim() || null,
          source_type: "job_card_invoice",
          job_card_id: jcId || null,
          job_number: String(inv?.job_number || "").trim() || null,
          order_number: orderNumberByJcId.get(jcId) || null,
          created_by_name: null,
        });
      }
    }

    const createdByIds = Array.from(
      new Set(
        results
          .map((inv) => String(inv?.created_by || "").trim())
          .filter(Boolean),
      ),
    );
    let userEmailById = new Map<string, string>();
    if (createdByIds.length > 0) {
      const { data: userRows } = await supabase
        .from("users")
        .select("id, email")
        .in("id", createdByIds);
      if (Array.isArray(userRows)) {
        userEmailById = new Map(
          userRows.map((u) => [String(u.id), String(u.email || "").trim()]),
        );
      }
    }

    for (const inv of results) {
      inv.created_by_name = userEmailById.get(String(inv?.created_by || "").trim()) || null;
    }

    return NextResponse.json({ invoices: results });
  } catch (error) {
    console.error("Unexpected error in invoices lookup:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
