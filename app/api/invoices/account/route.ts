import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildInvoiceFinancials,
  defaultDueDate,
  normalizeBillingMonth,
  upsertPaymentsMirror,
} from "@/lib/server/account-invoice-payments";

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
    const accountNumber = String(searchParams.get("accountNumber") || "").trim();
    const billingMonth = normalizeBillingMonth(searchParams.get("billingMonth"));

    if (!accountNumber) {
      return NextResponse.json(
        { error: "accountNumber is required" },
        { status: 400 },
      );
    }

    let query = supabase
      .from("account_invoices")
      .select("*")
      .eq("account_number", accountNumber)
      .order("created_at", { ascending: false })
      .limit(1);

    query = billingMonth ? query.eq("billing_month", billingMonth) : query.is("billing_month", null);

    const { data, error } = await query;
    if (error) {
      console.error("Failed to fetch account invoice:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch account invoice" },
        { status: 500 },
      );
    }

    return NextResponse.json({ invoice: Array.isArray(data) ? data[0] || null : null });
  } catch (error) {
    console.error("Unexpected error in account invoice GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const accountNumber = String(body?.accountNumber || "").trim();
    const billingMonth = normalizeBillingMonth(body?.billingMonth);
    const invoiceDate = body?.invoiceDate || new Date().toISOString();
    const dueDate = body?.dueDate || defaultDueDate(invoiceDate);

    if (!accountNumber) {
      return NextResponse.json(
        { error: "accountNumber is required" },
        { status: 400 },
      );
    }

    let existingQuery = supabase
      .from("account_invoices")
      .select("*")
      .eq("account_number", accountNumber)
      .order("created_at", { ascending: false })
      .limit(1);
    existingQuery = billingMonth
      ? existingQuery.eq("billing_month", billingMonth)
      : existingQuery.is("billing_month", null);

    const { data: existingInvoices, error: existingError } =
      await existingQuery;

    if (existingError) {
      console.error("Failed to check existing account invoice:", existingError);
      return NextResponse.json(
        { error: existingError.message || "Failed to check existing account invoice" },
        { status: 500 },
      );
    }

    const existingInvoice = Array.isArray(existingInvoices)
      ? existingInvoices[0] || null
      : null;

    if (existingInvoice) {
      const financials = buildInvoiceFinancials({
        totalAmount: Number(body?.totalAmount ?? existingInvoice.total_amount ?? 0),
        paidAmount: existingInvoice.paid_amount ?? 0,
        dueDate: body?.dueDate || existingInvoice.due_date || dueDate,
      });

      const updatePayload = {
        company_name: body?.companyName || existingInvoice.company_name || null,
        client_address: body?.clientAddress || existingInvoice.client_address || null,
        customer_vat_number: body?.customerVatNumber || existingInvoice.customer_vat_number || null,
        invoice_date: invoiceDate || existingInvoice.invoice_date,
        due_date: body?.dueDate || existingInvoice.due_date || dueDate,
        subtotal: Number(body?.subtotal ?? existingInvoice.subtotal ?? 0),
        vat_amount: Number(body?.vatAmount ?? existingInvoice.vat_amount ?? 0),
        discount_amount: Number(body?.discountAmount ?? existingInvoice.discount_amount ?? 0),
        total_amount: financials.totalAmount,
        paid_amount: financials.paidAmount,
        balance_due: financials.balanceDue,
        payment_status: financials.paymentStatus,
        fully_paid_at:
          financials.balanceDue <= 0
            ? existingInvoice.fully_paid_at || new Date().toISOString()
            : null,
        line_items: Array.isArray(body?.lineItems) ? body.lineItems : existingInvoice.line_items || [],
        notes: body?.notes ?? existingInvoice.notes ?? null,
      };

      const { data: updatedInvoice, error: updateError } = await supabase
        .from("account_invoices")
        .update(updatePayload)
        .eq("id", existingInvoice.id)
        .select("*")
        .single();

      if (updateError) {
        console.error("Failed to update existing account invoice:", updateError);
        return NextResponse.json(
          { error: updateError.message || "Failed to update existing account invoice" },
          { status: 500 },
        );
      }

      await upsertPaymentsMirror(supabase, updatedInvoice);
      return NextResponse.json({ invoice: updatedInvoice, reused: true });
    }

    const { data: allocatedInvoiceNumber, error: numberError } = await supabase.rpc(
      "allocate_document_number",
      {
        sequence_name: "invoice",
        prefix: "INV-",
      },
    );

    if (numberError || !allocatedInvoiceNumber) {
      console.error("Failed to allocate invoice number:", numberError);
      return NextResponse.json(
        { error: numberError?.message || "Failed to allocate invoice number" },
        { status: 500 },
      );
    }

    const payload = {
      account_number: accountNumber,
      billing_month: billingMonth,
      invoice_number: allocatedInvoiceNumber,
      company_name: body?.companyName || null,
      client_address: body?.clientAddress || null,
      customer_vat_number: body?.customerVatNumber || null,
      invoice_date: invoiceDate,
      due_date: dueDate,
      subtotal: Number(body?.subtotal || 0),
      vat_amount: Number(body?.vatAmount || 0),
      discount_amount: Number(body?.discountAmount || 0),
      total_amount: Number(body?.totalAmount || 0),
      paid_amount: 0,
      balance_due: Number(body?.totalAmount || 0),
      payment_status: "pending",
      line_items: Array.isArray(body?.lineItems) ? body.lineItems : [],
      notes: body?.notes || null,
      created_by: user.id,
    };

    const { data: insertedInvoice, error: insertError } = await supabase
      .from("account_invoices")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      console.error("Failed to create account invoice:", insertError, payload);
      return NextResponse.json(
        { error: insertError.message || "Failed to create account invoice" },
        { status: 500 },
      );
    }

    await upsertPaymentsMirror(supabase, insertedInvoice);

    return NextResponse.json({ invoice: insertedInvoice, reused: false });
  } catch (error) {
    console.error("Unexpected error in account invoice POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
