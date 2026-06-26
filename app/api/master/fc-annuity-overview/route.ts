import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const BATCH = 1000;
    const fetchAll = async (baseQuery: any) => {
      let from = 0;
      let allRows: any[] = [];
      while (true) {
        const { data: batch, error } = await baseQuery.range(from, from + BATCH - 1);
        if (error) return { data: null, error };
        const rows = batch || [];
        allRows = allRows.concat(rows);
        if (rows.length < BATCH) break;
        from += BATCH;
      }
      return { data: allRows, error: null };
    };

    // 1. Get ALL cost centres
    const { data: allCCs, error: ccError } = await fetchAll(
      supabase.from("cost_centers").select("id, cost_code, company, legal_name, fc_id, annuity_flag")
    );

    if (ccError) {
      return NextResponse.json({ error: ccError.message }, { status: 500 });
    }

    const ccList = Array.isArray(allCCs) ? allCCs : [];
    if (ccList.length === 0) {
      return NextResponse.json({ fcGroups: [], totalExVat: 0, totalVat: 0, totalInclVat: 0, fcsDone: 0, fcsTotal: 0 });
    }

    // 2. Get FC user emails
    const fcIds = Array.from(new Set(ccList.map((cc) => String(cc.fc_id || "")).filter(Boolean)));

    const { data: fcUsers } = await supabase
      .from("users")
      .select("id, email")
      .in("id", fcIds);

    const fcEmailMap = new Map<string, string>();
    (Array.isArray(fcUsers) ? fcUsers : []).forEach((u) => {
      fcEmailMap.set(String(u.id), String(u.email || ""));
    });

    // 3. Fetch ALL invoices from all three sources in parallel (batch fetch)
    const [annuityResult, jobCardResult, creditNoteResult] = await Promise.all([
      fetchAll(serviceSupabase.from("account_invoices").select("account_number, billing_month, invoice_number, total_amount, subtotal, vat_amount, payment_status")),
      fetchAll(serviceSupabase.from("invoices").select("account_number, invoice_number, invoice_date, total_amount, subtotal, vat_amount")),
      fetchAll(serviceSupabase.from("credit_notes").select("account_number, billing_month_applies_to, credit_note_number, amount, approved, decline_reason, status")),
    ]);

    if (annuityResult.error) return NextResponse.json({ error: annuityResult.error.message }, { status: 500 });
    if (jobCardResult.error) return NextResponse.json({ error: jobCardResult.error.message }, { status: 500 });
    if (creditNoteResult.error) return NextResponse.json({ error: creditNoteResult.error.message }, { status: 500 });

    const allAnnuityInvoices = Array.isArray(annuityResult.data) ? annuityResult.data : [];
    const allJobCardInvoices = Array.isArray(jobCardResult.data) ? jobCardResult.data : [];
    const allCreditNotes = Array.isArray(creditNoteResult.data) ? creditNoteResult.data : [];

    // 4. Filter by month and build lookups by NORMALIZED account_number
    const annuityByCode = new Map<string, typeof allAnnuityInvoices>();
    const jobCardByCode = new Map<string, typeof allJobCardInvoices>();
    const creditNoteByCode = new Map<string, typeof allCreditNotes>();

    for (const inv of allAnnuityInvoices) {
      if (month) {
        const invMonth = getMonthKey(inv.billing_month);
        if (invMonth !== month) continue;
      }
      const key = norm(inv.account_number);
      if (!key) continue;
      if (!annuityByCode.has(key)) annuityByCode.set(key, []);
      annuityByCode.get(key)!.push(inv);
    }

    for (const inv of allJobCardInvoices) {
      if (month) {
        const invMonth = getMonthKey(inv.invoice_date);
        if (invMonth !== month) continue;
      }
      const key = norm(inv.account_number);
      if (!key) continue;
      if (!jobCardByCode.has(key)) jobCardByCode.set(key, []);
      jobCardByCode.get(key)!.push(inv);
    }

    for (const cn of allCreditNotes) {
      if (month) {
        const cnMonth = getMonthKey(cn.billing_month_applies_to);
        if (cnMonth !== month) continue;
      }
      // Only include approved credit notes (not declined or pending)
      if (cn.approved !== true || cn.decline_reason) continue;
      const key = norm(cn.account_number);
      if (!key) continue;
      if (!creditNoteByCode.has(key)) creditNoteByCode.set(key, []);
      creditNoteByCode.get(key)!.push(cn);
    }

    // 5. Group cost centres by fc_id (or "unallocated"), deduplicate globally
    const ccsByFc = new Map<string, typeof ccList>();
    const unallocatedCCs: typeof ccList = [];
    const seenCostCodes = new Set<string>();

    for (const cc of ccList) {
      const fcId = String(cc.fc_id || "").trim();
      if (!fcId) continue;
      const code = norm(cc.cost_code);
      if (code && seenCostCodes.has(code)) continue;
      if (code) seenCostCodes.add(code);
      if (!ccsByFc.has(fcId)) ccsByFc.set(fcId, []);
      ccsByFc.get(fcId)!.push(cc);
    }

    for (const cc of ccList) {
      const fcId = String(cc.fc_id || "").trim();
      if (fcId) continue;
      const code = norm(cc.cost_code);
      if (code && seenCostCodes.has(code)) continue;
      if (code) seenCostCodes.add(code);
      unallocatedCCs.push(cc);
    }

    // 6. Build client rows with all three sources
    const buildClients = (ccs: typeof ccList) => {
      return ccs.map((cc) => {
        const code = norm(cc.cost_code);
        const annuityInvs = annuityByCode.get(code) || [];
        const jobCardInvs = jobCardByCode.get(code) || [];
        const creditNotes = creditNoteByCode.get(code) || [];

        // Annuity totals
        let annuityTotal = 0;
        let annuitySub = 0;
        let annuityInvoiceNumber: string | null = null;
        for (const inv of annuityInvs) {
          annuityTotal += Number(inv.total_amount || 0);
          annuitySub += Number(inv.subtotal || 0);
          if (!annuityInvoiceNumber) annuityInvoiceNumber = inv.invoice_number || "PENDING";
        }

        // Job card totals
        let jobCardTotal = 0;
        let jobCardSub = 0;
        let jobCardInvoiceNumber: string | null = null;
        for (const inv of jobCardInvs) {
          jobCardTotal += Number(inv.total_amount || 0);
          jobCardSub += Number(inv.subtotal || 0);
          if (!jobCardInvoiceNumber) jobCardInvoiceNumber = inv.invoice_number || null;
        }

        // Credit note totals (deducted) — amount is incl VAT
        let creditTotal = 0;
        let creditNoteNumber: string | null = null;
        for (const cn of creditNotes) {
          creditTotal += Number(cn.amount || 0);
          if (!creditNoteNumber) creditNoteNumber = cn.credit_note_number || null;
        }

        // Derive credit ex-VAT and VAT (15% standard rate)
        const creditExVat = creditTotal / 1.15;
        const creditVat = creditTotal - creditExVat;

        const combinedTotal = annuityTotal + jobCardTotal - creditTotal;
        const combinedSub = annuitySub + jobCardSub - creditExVat;
        const combinedVat = combinedTotal - combinedSub;

        return {
          cost_code: cc.cost_code || "—",
          company: cc.company || cc.legal_name || cc.cost_code || "—",
          annuity_flag: Boolean(cc.annuity_flag),
          annuity_invoice_number: annuityInvs.length > 0 ? annuityInvoiceNumber : null,
          annuity_invoice_count: annuityInvs.length,
          annuity_subtotal: annuitySub,
          annuity_total: annuityTotal,
          job_card_invoice_number: jobCardInvs.length > 0 ? jobCardInvoiceNumber : null,
          job_card_invoice_count: jobCardInvs.length,
          job_card_subtotal: jobCardSub,
          job_card_total: jobCardTotal,
          credit_note_count: creditNotes.length,
          credit_note_number: creditNoteNumber,
          credit_total: creditTotal,
          subtotal: combinedSub,
          vat_amount: combinedVat,
          total_amount: combinedTotal,
        };
      }).sort((a, b) => a.company.localeCompare(b.company));
    };

    // 7. Build FC groups
    let totalExVat = 0;
    let totalVat = 0;
    let totalInclVat = 0;
    let totalAnnuity = 0;
    let totalJobCards = 0;
    let totalCreditNotes = 0;
    let fcsDone = 0;

    const buildFcGroup = (fcId: string, fcEmail: string, myCCs: typeof ccList) => {
      const clients = buildClients(myCCs);

      let invoicedTotal = 0;
      let invoicedSub = 0;
      let fcAnnuity = 0;
      let fcJobCards = 0;
      let fcCreditNotes = 0;
      let hasAnyInvoice = false;

      clients.forEach((c) => {
        hasAnyInvoice = hasAnyInvoice || c.annuity_invoice_count > 0;
        invoicedSub += c.subtotal;
        invoicedTotal += c.total_amount;
        fcAnnuity += c.annuity_total;
        fcJobCards += c.job_card_total;
        fcCreditNotes += c.credit_total;
      });

      const allDone = clients.length > 0 && clients.every((c) => c.annuity_invoice_count > 0 || c.job_card_invoice_count > 0);

      totalExVat += invoicedSub;
      totalVat += invoicedTotal - invoicedSub;
      totalInclVat += invoicedTotal;
      totalAnnuity += fcAnnuity;
      totalJobCards += fcJobCards;
      totalCreditNotes += fcCreditNotes;
      if (allDone) fcsDone++;

      return {
        fc_id: fcId,
        fc_email: fcEmail,
        clients,
        total_invoiced: invoicedTotal,
        total_ex_vat: invoicedSub,
        total_vat: invoicedTotal - invoicedSub,
        annuity_total: fcAnnuity,
        job_card_total: fcJobCards,
        credit_total: fcCreditNotes,
        client_count: clients.length,
        invoiced_client_count: clients.filter((c) => c.annuity_invoice_count > 0 || c.job_card_invoice_count > 0).length,
        all_annuity_done: allDone,
      };
    };

    const fcGroups = fcIds
      .map((fcId) => buildFcGroup(fcId, fcEmailMap.get(fcId) || "unknown", ccsByFc.get(fcId) || []))
      .filter((g) => g.client_count > 0);

    // 8. Unallocated group
    if (unallocatedCCs.length > 0) {
      fcGroups.push(buildFcGroup("unallocated", "Unallocated", unallocatedCCs));
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
      totalAnnuity,
      totalJobCards,
      totalCreditNotes,
      fcsDone,
      fcsTotal: fcGroups.length,
    });
  } catch (error) {
    console.error("Error in fc-annuity-overview GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
