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

  // Handle ISO timestamps like 2025-01-15T00:00:00Z or 2025-01-15T00:00:00+00:00
  const isoMatch = raw.match(/^(\d{4}-\d{2})-\d{2}T/);
  if (isoMatch) {
    return isoMatch[1];
  }

  // Handle date-only with timezone offset like 2025-01-15+00:00
  const dateOffsetMatch = raw.match(/^(\d{4}-\d{2})-\d{2}[+-]/);
  if (dateOffsetMatch) {
    return dateOffsetMatch[1];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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
    const clientName = normalizeSearch(searchParams.get("client_name"));
    const month = normalizeMonthParam(searchParams.get("month"));
    const costCodes = normalizeSearch(searchParams.get("cost_codes"));
    const sourceType = normalizeSearch(searchParams.get("source_type")).toLowerCase();
    const fetchAll = ["1", "true", "yes"].includes(
      String(searchParams.get("all") || "").trim().toLowerCase(),
    );
    const limit = Math.min(
      Math.max(Number.parseInt(String(searchParams.get("limit") || "100"), 10) || 100, 1),
      5000,
    );

    // Fetch ALL invoices — no case-sensitive .in() filter; filter in code instead
    let query = supabase
      .from("account_invoices")
      .select(
        "id, account_number, billing_month, invoice_number, invoice_date, total_amount, paid_amount, balance_due, payment_status, company_name, customer_vat_number, company_registration_number, client_address, line_items, notes, created_at, created_by",
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

    let jobCardInvoiceQuery = supabase
      .from("invoices")
      .select(
        "id, job_card_id, job_number, account_number, invoice_number, invoice_date, total_amount, client_name, client_address, line_items, notes, created_at, created_by",
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

    const rawJobCardInvoices = Array.isArray(jobCardInvoices)
      ? (jobCardInvoices as Record<string, unknown>[])
      : [];

    const jobCardIds = rawJobCardInvoices
      .map((inv) => String(inv?.job_card_id || "").trim())
      .filter(Boolean);

    let orderNumberByJobCardId = new Map<string, string | null>();
    let newAccountNumberByJobCardId = new Map<string, string>();
    if (jobCardIds.length > 0) {
      const { data: jobCards } = await supabase
        .from("job_cards")
        .select("id, order_number, new_account_number")
        .in("id", jobCardIds);
      if (Array.isArray(jobCards)) {
        orderNumberByJobCardId = new Map(
          jobCards.map((jc) => [String(jc.id), jc.order_number || null]),
        );
        newAccountNumberByJobCardId = new Map(
          jobCards.map((jc) => [String(jc.id), String(jc.new_account_number || "").trim().toUpperCase()]),
        );
      }
    }

    const invoiceNumberToJobCardId = new Map<string, string>();
    const jobNumberByInvoiceNumber = new Map<string, string>();
    for (const inv of rawJobCardInvoices) {
      const invNum = String(inv?.invoice_number || "").trim().toUpperCase();
      const jcId = String(inv?.job_card_id || "").trim();
      if (invNum && jcId) {
        invoiceNumberToJobCardId.set(invNum, jcId);
      }
      const jobNum = String(inv?.job_number || "").trim();
      if (invNum && jobNum) {
        jobNumberByInvoiceNumber.set(invNum, jobNum);
      }
    }

    const normalizedJobCardInvoices = rawJobCardInvoices.map((invoice) => {
      const invoiceMonthKey = getMonthKeyFromValue(invoice?.invoice_date || invoice?.created_at);
      const jcId = String(invoice?.job_card_id || "").trim();
      const jobCardNewAccountNumber = jcId ? newAccountNumberByJobCardId.get(jcId) || null : null;
      return {
        id: `job-card-${String(invoice?.id || "").trim()}`,
        account_number: jobCardNewAccountNumber || String(invoice?.account_number || "").trim() || null,
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
        created_by: String(invoice?.created_by || "").trim() || null,
        source_type: "job_card_invoice",
        job_card_id: jcId || null,
        job_number: String(invoice?.job_number || "").trim() || null,
        order_number: orderNumberByJobCardId.get(jcId) || null,
      };
    });

    const accountRows = (Array.isArray(invoices)
      ? (invoices as Record<string, unknown>[])
      : []
    ).map((row) => {
      const invNum = String(row?.invoice_number || "").trim().toUpperCase();
      const linkedJobCardId = invNum ? invoiceNumberToJobCardId.get(invNum) : null;
      return {
        ...row,
        source_type: "account_invoice",
        created_by: String(row?.created_by || "").trim() || null,
        job_card_id: linkedJobCardId || null,
        job_number: invNum ? jobNumberByInvoiceNumber.get(invNum) || null : null,
        order_number: linkedJobCardId ? orderNumberByJobCardId.get(linkedJobCardId) || null : null,
      };
    });

    // Combine both tables — no merge, no dedup, every invoice counted individually
    const allRows = [...accountRows, ...normalizedJobCardInvoices];

    const searchFilteredRows = search
      ? allRows.filter((invoice) => {
          const needle = search.toLowerCase();
          return [
            invoice?.invoice_number,
            invoice?.account_number,
            invoice?.company_name,
            invoice?.customer_vat_number,
            invoice?.company_registration_number,
          ].some((value) => String(value || "").toLowerCase().includes(needle));
        })
      : allRows;

    const monthFilteredRows = month
      ? searchFilteredRows.filter((invoice) => {
          const billingMonth = getMonthKeyFromValue(invoice?.billing_month);
          const invoiceMonth = getMonthKeyFromValue(invoice?.invoice_date);
          const matches = billingMonth === month || invoiceMonth === month;
          if (!matches) {
            console.log(`[Invoice Filter] Excluded: invoice=${invoice?.invoice_number}, billing_month=${invoice?.billing_month} -> ${billingMonth}, invoice_date=${invoice?.invoice_date} -> ${invoiceMonth}, expected=${month}`);
          }
          return matches;
        })
      : searchFilteredRows;

    console.log(`[Invoice Filter] Month=${month}, total=${searchFilteredRows.length}, filtered=${monthFilteredRows.length}`);

    const sourceTypeFilteredRows = sourceType && sourceType !== "all"
      ? monthFilteredRows.filter((invoice) => {
          const st = String(invoice?.source_type || "").trim().toLowerCase();
          if (sourceType === "annuity") return st === "account_invoice";
          if (sourceType === "job_card" || sourceType === "jobcard") return st === "job_card_invoice";
          return true;
        })
      : monthFilteredRows;

    // Cost codes filter — case-insensitive, in code
    const costCodesList = costCodes
      ? costCodes.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)
      : [];
    const costCodesFilteredRows = costCodesList.length > 0
      ? sourceTypeFilteredRows.filter((invoice) => {
          const acct = String(invoice?.account_number || "").trim().toUpperCase();
          return costCodesList.includes(acct);
        })
      : sourceTypeFilteredRows;

    // Client name filter — case-insensitive partial match
    const clientNameFilteredRows = clientName
      ? costCodesFilteredRows.filter((invoice) => {
          const name = String(invoice?.company_name || "").trim().toLowerCase();
          return name.includes(clientName.toLowerCase());
        })
      : costCodesFilteredRows;

    let costCentersByCode = new Map<string, Record<string, unknown>>();
    const { data: allCostCenters, error: allCostCentersError } = await supabase
      .from("cost_centers")
      .select(
        "cost_code, company, legal_name, vat_number, registration_number, physical_address_1, physical_address_2, physical_address_3, physical_area, physical_code",
      )
      .range(0, 9999);

    if (allCostCentersError) {
      console.error("Failed to fetch cost centers for invoice enrichment:", allCostCentersError);
    } else {
      costCentersByCode = new Map(
        (Array.isArray(allCostCenters) ? allCostCenters : []).map((row) => [
          String(row?.cost_code || "").trim().toUpperCase(),
          row,
        ]),
      );
    }

    const invoicesWithCustomerInfo = clientNameFilteredRows.map((invoice) => {
      const accountNumber = String(invoice?.account_number || "").trim();
      const costCenter = costCentersByCode.get(accountNumber.toUpperCase()) || null;
      const costCenterAddress = [
        costCenter?.physical_address_1,
        costCenter?.physical_address_2,
        costCenter?.physical_address_3,
        costCenter?.physical_area,
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

    const createdByIds = Array.from(
      new Set(
        invoicesWithCustomerInfo
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

    const invoicesWithUserInfo = invoicesWithCustomerInfo.map((invoice) => ({
      ...invoice,
      source_type: String(invoice?.source_type || "").trim() || "account_invoice",
      created_by_name: userEmailById.get(String(invoice?.created_by || "").trim()) || null,
    }));

    return NextResponse.json({
      invoices: invoicesWithUserInfo,
      filters: { month },
    });
  } catch (error) {
    console.error("Unexpected error in accounts invoices GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
