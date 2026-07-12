import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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
    const search = String(searchParams.get("search") || "").trim();
    const status = String(searchParams.get("status") || "").trim();
    const accountNumber = String(searchParams.get("account_number") || "").trim();

    let query = supabase
      .from("credit_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (accountNumber) {
      const codes = accountNumber.split(",").map((c) => c.trim()).filter(Boolean);
      if (codes.length === 1) {
        query = query.eq("account_number", codes[0]);
      } else if (codes.length > 1) {
        query = query.in("account_number", codes);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching credit notes:", error);
      return NextResponse.json({ error: "Failed to fetch credit notes" }, { status: 500 });
    }

    let results = data || [];

    if (search) {
      const q = search.toLowerCase();
      results = results.filter((cn: any) =>
        [cn.credit_note_number, cn.account_number, cn.client_name, cn.reference, cn.reason, cn.invoice_credited]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return NextResponse.json({ credit_notes: results });
  } catch (error) {
    console.error("Error in credit notes GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const accountNumber = String(body?.accountNumber || "").trim();
    const clientName = String(body?.clientName || "").trim() || null;
    const billingMonth = String(body?.billingMonth || "").trim();
    const creditNoteDate = String(body?.creditNoteDate || "").trim();
    const amount = Number(body?.amount);
    const reference = String(body?.reference || "").trim() || null;
    const comment = String(body?.comment || "").trim() || null;
    const reason = String(body?.reason || "").trim() || null;
    const invoiceCredited = String(body?.invoiceCredited || "").trim() || null;

    if (!accountNumber) {
      return NextResponse.json({ error: "Account number is required." }, { status: 400 });
    }
    if (!billingMonth) {
      return NextResponse.json({ error: "Billing month is required." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 });
    }

    // Server-side duplicate check: prevent crediting the same invoice twice
    if (invoiceCredited) {
      const { data: existingCN, error: existingCNError } = await serviceSupabase
        .from("credit_notes")
        .select("id, credit_note_number")
        .eq("invoice_credited", invoiceCredited)
        .limit(1);

      if (existingCNError) {
        console.error("Error checking existing credit notes:", existingCNError);
      }

      if (existingCN && existingCN.length > 0) {
        return NextResponse.json(
          { error: `Invoice ${invoiceCredited} already has a credit note (${existingCN[0].credit_note_number}).` },
          { status: 409 },
        );
      }
    }

    const billingMonthDate = billingMonth.length === 7 ? `${billingMonth}-01` : billingMonth;

    let resolvedClientName = clientName;
    if (!resolvedClientName) {
      const { data: costCenter } = await serviceSupabase
        .from("cost_centers")
        .select("company")
        .or(`account_number.eq.${accountNumber},cost_code.eq.${accountNumber}`)
        .maybeSingle();
      resolvedClientName = costCenter?.company || null;
    }

    // Generate unique TEMP number via DB sequence
    const { data: tempNumber, error: tempError } = await serviceSupabase
      .rpc("allocate_credit_note_temp_number");

    if (tempError || !tempNumber) {
      console.error("Error generating temp credit note number:", tempError);
      return NextResponse.json({ error: "Failed to generate credit note number" }, { status: 500 });
    }

    const { data: creditNote, error: insertError } = await serviceSupabase
      .from("credit_notes")
      .insert({
        credit_note_number: tempNumber,
          account_number: accountNumber,
          client_name: resolvedClientName,
          billing_month_applies_to: billingMonthDate,
          credit_note_date: creditNoteDate ? new Date(creditNoteDate).toISOString() : new Date().toISOString(),
          amount,
          applied_amount: amount,
          unapplied_amount: 0,
          reference,
          comment,
          reason,
          invoice_credited: invoiceCredited,
          status: "applied",
          created_by: user.id,
          created_by_email: user.email || null,
        })
        .select()
        .maybeSingle();

    if (insertError) {
      console.error("Error inserting credit note:", insertError);
      return NextResponse.json({ error: `Failed to create credit note: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      creditNote,
      appliedAmount: amount,
      unappliedAmount: 0,
    });
  } catch (error) {
    console.error("Error in credit notes POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
