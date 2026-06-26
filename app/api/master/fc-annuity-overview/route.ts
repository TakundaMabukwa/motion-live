import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const norm = (v: unknown) => String(v || "").trim().toUpperCase();

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

    // 3. Fetch ALL account_invoices for the month — no row limit
    let invoiceQuery = supabase
      .from("account_invoices")
      .select("account_number, billing_month, invoice_number, total_amount, subtotal, vat_amount, payment_status")
      .range(0, 9999);

    if (month) {
      const monthStart = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      invoiceQuery = invoiceQuery.gte("billing_month", monthStart).lt("billing_month", nextMonth);
    }

    const { data: invoices, error: invError } = await invoiceQuery;

    if (invError) {
      return NextResponse.json({ error: invError.message }, { status: 500 });
    }

    // 4. Build invoice lookup: NORMALIZED account_number -> invoice (first-write-wins per account)
    const invoiceByCode = new Map<string, (typeof invoices)[number]>();
    (Array.isArray(invoices) ? invoices : []).forEach((inv) => {
      const key = norm(inv.account_number);
      if (key && !invoiceByCode.has(key)) {
        invoiceByCode.set(key, inv);
      }
    });

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

    // 6. Build client rows for a list of cost centres
    const buildClients = (ccs: typeof ccList) => {
      const rows = ccs.map((cc) => {
        const code = norm(cc.cost_code);
        // Look up invoice for ALL clients, not just annuity-flagged
        const inv = invoiceByCode.get(code) || null;
        const amount = inv ? Number(inv.total_amount || 0) : 0;
        const sub = inv ? Number(inv.subtotal || 0) : 0;
        const vat = inv ? Number(inv.vat_amount || 0) : 0;

        return {
          cost_code: cc.cost_code || "—",
          company: cc.company || cc.legal_name || cc.cost_code || "—",
          annuity_flag: Boolean(cc.annuity_flag),
          invoice_number: inv ? inv.invoice_number || "PENDING" : null,
          subtotal: sub,
          vat_amount: vat,
          total_amount: amount,
          payment_status: inv ? inv.payment_status || "pending" : null,
        };
      });

      rows.sort((a, b) => {
        if (a.annuity_flag !== b.annuity_flag) return a.annuity_flag ? -1 : 1;
        return b.total_amount - a.total_amount;
      });

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

        // Done = ALL clients under this FC have an invoice for the month
        const annuityClients = clients.filter((c) => c.annuity_flag);
        const allDone = clients.length > 0 && clients.every((c) => c.invoice_number && c.invoice_number !== "PENDING");

        let groupTotal = 0;
        let groupSub = 0;
        let groupVat = 0;
        clients.forEach((c) => {
          groupSub += c.subtotal;
          groupVat += c.vat_amount;
          groupTotal += c.total_amount;
        });

        totalExVat += groupSub;
        totalVat += groupVat;
        totalInclVat += groupTotal;
        if (allDone) fcsDone++;

        return {
          fc_id: fcId,
          fc_email: fcEmail,
          clients,
          total_invoiced: groupTotal,
          total_ex_vat: groupSub,
          total_vat: groupVat,
          client_count: clients.length,
          annuity_client_count: annuityClients.length,
          all_annuity_done: allDone,
        };
      })
      .filter((g) => g.client_count > 0);

    // 8. Unallocated group (clients with no fc_id)
    if (unallocatedCCs.length > 0) {
      const clients = buildClients(unallocatedCCs);

      let groupTotal = 0;
      let groupSub = 0;
      let groupVat = 0;
      clients.forEach((c) => {
        groupSub += c.subtotal;
        groupVat += c.vat_amount;
        groupTotal += c.total_amount;
      });

      const allDone = clients.length > 0 && clients.every((c) => c.invoice_number && c.invoice_number !== "PENDING");

      totalExVat += groupSub;
      totalVat += groupVat;
      totalInclVat += groupTotal;

      fcGroups.push({
        fc_id: "unallocated",
        fc_email: "Unallocated",
        clients,
        total_invoiced: groupTotal,
        total_ex_vat: groupSub,
        total_vat: groupVat,
        client_count: clients.length,
        annuity_client_count: clients.filter((c) => c.annuity_flag).length,
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
