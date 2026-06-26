import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const norm = (v: unknown) => String(v || "").trim().toUpperCase();

const getMonthKey = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : null;
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
    const month = searchParams.get("month")?.trim() || null;

    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month format. Use YYYY-MM." }, { status: 400 });
    }

    // 1. Get ALL cost centres (including those with no fc_id)
    const { data: allCCs, error: ccError } = await supabase
      .from("cost_centers")
      .select("id, cost_code, company, legal_name, fc_id, annuity_flag")
      .range(0, 9999);

    if (ccError) {
      return NextResponse.json({ error: ccError.message }, { status: 500 });
    }

    const ccList = Array.isArray(allCCs) ? allCCs : [];
    if (ccList.length === 0) {
      return NextResponse.json({ fcGroups: [], totalExVat: 0, totalVat: 0, totalInclVat: 0, fcsDone: 0, fcsTotal: 0 });
    }

    // 2. Get unique FC user IDs and look up their emails
    const fcIds = Array.from(new Set(ccList.map((cc) => String(cc.fc_id || "")).filter(Boolean)));

    const { data: fcUsers } = await supabase
      .from("users")
      .select("id, email")
      .in("id", fcIds);

    const fcEmailMap = new Map<string, string>();
    (Array.isArray(fcUsers) ? fcUsers : []).forEach((u) => {
      fcEmailMap.set(String(u.id), String(u.email || ""));
    });

    // 3. Fetch ALL account_invoices — no date filter, filter in code
    const { data: invoices, error: invError } = await supabase
      .from("account_invoices")
      .select("account_number, billing_month, invoice_number, total_amount, subtotal, vat_amount, payment_status")
      .range(0, 9999);

    if (invError) {
      return NextResponse.json({ error: invError.message }, { status: 500 });
    }

    // 4. Filter invoices by month in code, build lookup: NORMALIZED account_number -> invoice[]
    const allInvoices = Array.isArray(invoices) ? invoices : [];
    const invoiceByCode = new Map<string, typeof allInvoices>();

    for (const inv of allInvoices) {
      // Filter by month if provided
      if (month) {
        const invMonth = getMonthKey(inv.billing_month);
        if (invMonth !== month) continue;
      }
      const key = norm(inv.account_number);
      if (!key) continue;
      if (!invoiceByCode.has(key)) invoiceByCode.set(key, []);
      invoiceByCode.get(key)!.push(inv);
    }

    // 5. Group cost centres by fc_id (or "unallocated"), deduplicate by cost_code
    const ccsByFc = new Map<string, typeof ccList>();
    const unallocatedCCs: typeof ccList = [];

    for (const cc of ccList) {
      const fcId = String(cc.fc_id || "").trim();
      if (!fcId) {
        unallocatedCCs.push(cc);
        continue;
      }
      if (!ccsByFc.has(fcId)) ccsByFc.set(fcId, []);
      const list = ccsByFc.get(fcId)!;
      const code = norm(cc.cost_code);
      if (code && list.some((existing) => norm(existing.cost_code) === code)) continue;
      list.push(cc);
    }

    // 6. Build client rows — sum all invoices per account
    const buildClients = (ccs: typeof ccList) => {
      const rows = ccs.map((cc) => {
        const code = norm(cc.cost_code);
        const invs = invoiceByCode.get(code) || [];

        let totalAmount = 0;
        let totalSub = 0;
        let totalVat = 0;
        let invoiceNumber: string | null = null;
        let paymentStatus: string | null = null;

        for (const inv of invs) {
          totalAmount += Number(inv.total_amount || 0);
          totalSub += Number(inv.subtotal || 0);
          totalVat += Number(inv.vat_amount || 0);
          if (!invoiceNumber) invoiceNumber = inv.invoice_number || "PENDING";
          if (!paymentStatus) paymentStatus = inv.payment_status || "pending";
        }

        return {
          cost_code: cc.cost_code || "—",
          company: cc.company || cc.legal_name || cc.cost_code || "—",
          annuity_flag: Boolean(cc.annuity_flag),
          invoice_number: invs.length > 0 ? invoiceNumber : null,
          invoice_count: invs.length,
          subtotal: totalSub,
          vat_amount: totalVat,
          total_amount: totalAmount,
          payment_status: invs.length > 0 ? paymentStatus : null,
        };
      });

      rows.sort((a, b) => b.total_amount - a.total_amount);

      return rows;
    };

    // 7. Build FC groups
    let totalExVat = 0;
    let totalVat = 0;
    let totalInclVat = 0;
    let fcsDone = 0;

    const fcGroups = fcIds
      .map((fcId) => {
        const myCCs = ccsByFc.get(fcId) || [];
        const fcEmail = fcEmailMap.get(fcId) || "unknown";

        const clients = buildClients(myCCs);

        // Done = ALL clients under this FC have at least one invoice for the month
        const allDone = clients.length > 0 && clients.every((c) => c.invoice_count > 0);

        let groupTotal = 0;
        let groupSub = 0;
        let groupVat = 0;
        let invoicedTotal = 0;
        let invoicedSub = 0;
        let invoicedVat = 0;
        clients.forEach((c) => {
          groupSub += c.subtotal;
          groupVat += c.vat_amount;
          groupTotal += c.total_amount;
          if (c.invoice_number) {
            invoicedSub += c.subtotal;
            invoicedVat += c.vat_amount;
            invoicedTotal += c.total_amount;
          }
        });

        totalExVat += invoicedSub;
        totalVat += invoicedVat;
        totalInclVat += invoicedTotal;
        if (allDone) fcsDone++;

        return {
          fc_id: fcId,
          fc_email: fcEmail,
          clients,
          total_invoiced: invoicedTotal,
          total_ex_vat: invoicedSub,
          total_vat: invoicedVat,
          client_count: clients.length,
          invoiced_client_count: clients.filter((c) => c.invoice_number).length,
          all_annuity_done: allDone,
        };
      })
      .filter((g) => g.client_count > 0);

    // 8. Unallocated group (clients with no fc_id)
    if (unallocatedCCs.length > 0) {
      const clients = buildClients(unallocatedCCs);

      let invoicedTotal = 0;
      let invoicedSub = 0;
      let invoicedVat = 0;
      clients.forEach((c) => {
        if (c.invoice_number) {
          invoicedSub += c.subtotal;
          invoicedVat += c.vat_amount;
          invoicedTotal += c.total_amount;
        }
      });

      const allDone = clients.length > 0 && clients.every((c) => c.invoice_count > 0);

      totalExVat += invoicedSub;
      totalVat += invoicedVat;
      totalInclVat += invoicedTotal;

      fcGroups.push({
        fc_id: "unallocated",
        fc_email: "Unallocated",
        clients,
        total_invoiced: invoicedTotal,
        total_ex_vat: invoicedSub,
        total_vat: invoicedVat,
        client_count: clients.length,
        invoiced_client_count: clients.filter((c) => c.invoice_number).length,
        all_annuity_done: allDone,
      });
    }

    fcGroups.sort((a, b) => {
      if (a.fc_id === "unallocated") return 1;
      if (b.fc_id === "unallocated") return -1;
      return b.total_invoiced - a.total_invoiced;
    });

    return NextResponse.json({
      fcGroups,
      month,
      totalExVat,
      totalVat,
      totalInclVat,
      fcsDone,
      fcsTotal: fcGroups.length,
    });
  } catch (error) {
    console.error("Error in fc-annuity-overview GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
