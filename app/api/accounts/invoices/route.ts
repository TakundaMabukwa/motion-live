import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const normalizeSearch = (value: unknown) => String(value || "").trim();

const normalizeMonthParam = (value: unknown) => {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : null;
};

const getMonthKeyFromValue = (value: unknown) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Fast path for plain YYYY-MM / YYYY-MM-DD values.
  const plainDateMatch = raw.match(/^(\d{4}-\d{2})(?:-\d{2})?$/);
  if (plainDateMatch) {
    return plainDateMatch[1];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const buildInvoiceMergeKey = (invoice: Record<string, unknown>) => {
  const invoiceNumber = String(invoice?.invoice_number || "").trim().toUpperCase();
  if (invoiceNumber) return `inv:${invoiceNumber}`;
  const fallbackId = String(invoice?.id || "").trim();
  if (fallbackId) return `id:${fallbackId}`;
  const account = String(invoice?.account_number || "").trim().toUpperCase();
  const invoiceDate = String(invoice?.invoice_date || invoice?.created_at || "").trim();
  return `fallback:${account}:${invoiceDate}`;
};

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
    const month = normalizeMonthParam(searchParams.get("month"));
    const fetchAll = ["1", "true", "yes"].includes(
      String(searchParams.get("all") || "").trim().toLowerCase(),
    );
    const limit = Math.min(
      Math.max(Number.parseInt(String(searchParams.get("limit") || "100"), 10) || 100, 1),
      5000,
    );

    let query = supabase
      .from("account_invoices")
      .select(
        "id, account_number, billing_month, invoice_number, invoice_date, total_amount, paid_amount, balance_due, payment_status, company_name, customer_vat_number, company_registration_number, client_address, line_items, notes, created_at",
      )
      .order("created_at", { ascending: false })
      .order("invoice_date", { ascending: false, nullsFirst: false });

    query = fetchAll ? query.range(0, 9999) : query.limit(limit);

    const { data: invoices, error } = await query;

    if (error) {
      console.error("Failed to fetch account invoices:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch invoices" },
        { status: 500 },
      );
    }

    const accountRows = Array.isArray(invoices)
      ? (invoices as Record<string, unknown>[])
      : [];

    let jobCardInvoiceQuery = supabase
      .from("invoices")
      .select(
        "id, account_number, invoice_number, invoice_date, total_amount, client_name, client_address, line_items, notes, created_at",
      )
      .order("created_at", { ascending: false })
      .order("invoice_date", { ascending: false, nullsFirst: false });

    jobCardInvoiceQuery = fetchAll
      ? jobCardInvoiceQuery.range(0, 9999)
      : jobCardInvoiceQuery.limit(limit);

    const { data: jobCardInvoices, error: jobCardInvoicesError } = await jobCardInvoiceQuery;

    if (jobCardInvoicesError) {
      console.error("Failed to fetch job-card invoices for accounts invoices:", jobCardInvoicesError);
    }

    const normalizedJobCardInvoices = (Array.isArray(jobCardInvoices)
      ? (jobCardInvoices as Record<string, unknown>[])
      : []
    ).map((invoice) => {
      const invoiceMonthKey = getMonthKeyFromValue(invoice?.invoice_date || invoice?.created_at);
      return {
        id: `job-card-${String(invoice?.id || "").trim()}`,
        account_number: String(invoice?.account_number || "").trim() || null,
        billing_month: invoiceMonthKey ? `${invoiceMonthKey}-01` : null,
        invoice_number: String(invoice?.invoice_number || "").trim() || null,
        invoice_date: String(invoice?.invoice_date || "").trim() || null,
        total_amount: Number(invoice?.total_amount || 0),
        paid_amount: 0,
        balance_due: Number(invoice?.total_amount || 0),
        payment_status: "pending",
        company_name: String(invoice?.client_name || "").trim() || null,
        customer_vat_number: null,
        company_registration_number: null,
        client_address: String(invoice?.client_address || "").trim() || null,
        line_items: Array.isArray(invoice?.line_items) ? invoice.line_items : [],
        notes: String(invoice?.notes || "").trim() || null,
        created_at: String(invoice?.created_at || "").trim() || null,
      };
    });

    const mergedByInvoiceKey = new Map<string, Record<string, unknown>>();
    for (const row of accountRows) {
      mergedByInvoiceKey.set(buildInvoiceMergeKey(row), row);
    }

    for (const row of normalizedJobCardInvoices) {
      const key = buildInvoiceMergeKey(row);
      if (!mergedByInvoiceKey.has(key)) {
        mergedByInvoiceKey.set(key, row);
      }
    }

    const mergedRows = Array.from(mergedByInvoiceKey.values());

    const searchFilteredRows = search
      ? mergedRows.filter((invoice) => {
          const needle = search.toLowerCase();
          return [
            invoice?.invoice_number,
            invoice?.account_number,
            invoice?.company_name,
            invoice?.customer_vat_number,
            invoice?.company_registration_number,
          ].some((value) => String(value || "").toLowerCase().includes(needle));
        })
      : mergedRows;

    const monthFilteredRows = month
      ? searchFilteredRows.filter((invoice) => {
          const billingMonth = getMonthKeyFromValue(invoice?.billing_month);
          const invoiceMonth = getMonthKeyFromValue(invoice?.invoice_date);
          return billingMonth === month || invoiceMonth === month;
        })
      : searchFilteredRows;

    const accountNumbers = Array.from(
      new Set(
        monthFilteredRows
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

    const invoicesWithCustomerInfo = monthFilteredRows.map((invoice) => {
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

    return NextResponse.json({
      invoices: invoicesWithCustomerInfo,
      filters: { month },
    });
  } catch (error) {
    console.error("Unexpected error in accounts invoices GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
