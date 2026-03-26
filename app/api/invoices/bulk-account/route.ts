import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeBillingMonth } from "@/lib/server/account-invoice-payments";

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
      .from("bulk_account_invoices")
      .select("*")
      .eq("account_number", accountNumber)
      .order("created_at", { ascending: false })
      .limit(1);

    query = billingMonth ? query.eq("billing_month", billingMonth) : query.is("billing_month", null);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch bulk account invoice" },
        { status: 500 },
      );
    }

    return NextResponse.json({ invoice: Array.isArray(data) ? data[0] || null : null });
  } catch (error) {
    console.error("Unexpected error in bulk account invoice GET:", error);
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

    if (!accountNumber) {
      return NextResponse.json(
        { error: "accountNumber is required" },
        { status: 400 },
      );
    }

    let existingQuery = supabase
      .from("bulk_account_invoices")
      .select("*")
      .eq("account_number", accountNumber)
      .order("created_at", { ascending: false })
      .limit(1);

    existingQuery = billingMonth
      ? existingQuery.eq("billing_month", billingMonth)
      : existingQuery.is("billing_month", null);

    const { data: existingInvoices, error: existingError } = await existingQuery;

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message || "Failed to check bulk invoice" },
        { status: 500 },
      );
    }

    const existingInvoice = Array.isArray(existingInvoices)
      ? existingInvoices[0] || null
      : null;

    const payload = {
      account_number: accountNumber,
      billing_month: billingMonth,
      company_name: body?.companyName || null,
      client_address: body?.clientAddress || null,
      customer_vat_number: body?.customerVatNumber || null,
      invoice_date: invoiceDate,
      subtotal: Number(body?.subtotal || 0),
      vat_amount: Number(body?.vatAmount || 0),
      discount_amount: Number(body?.discountAmount || 0),
      total_amount: Number(body?.totalAmount || 0),
      line_items: Array.isArray(body?.lineItems) ? body.lineItems : [],
      notes: body?.notes || null,
    };

    if (existingInvoice) {
      const { data: updatedInvoice, error: updateError } = await supabase
        .from("bulk_account_invoices")
        .update(payload)
        .eq("id", existingInvoice.id)
        .select("*")
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Failed to update bulk invoice" },
          { status: 500 },
        );
      }

      return NextResponse.json({ invoice: updatedInvoice, reused: true });
    }

    const { data: allocatedInvoiceNumber, error: numberError } = await supabase.rpc(
      "allocate_bulk_document_number",
      {
        sequence_name: "bulk_invoice",
        prefix: "INV",
      },
    );

    if (numberError || !allocatedInvoiceNumber) {
      return NextResponse.json(
        { error: numberError?.message || "Failed to allocate bulk invoice number" },
        { status: 500 },
      );
    }

    const { data: insertedInvoice, error: insertError } = await supabase
      .from("bulk_account_invoices")
      .insert({
        ...payload,
        invoice_number: allocatedInvoiceNumber,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Failed to create bulk invoice" },
        { status: 500 },
      );
    }

    return NextResponse.json({ invoice: insertedInvoice, reused: false });
  } catch (error) {
    console.error("Unexpected error in bulk account invoice POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const invoiceNumber = body?.invoiceNumber === undefined ? null : String(body.invoiceNumber || "").trim();
    const customerVatNumber = body?.customerVatNumber === undefined ? null : String(body.customerVatNumber || "").trim();

    if (!accountNumber) {
      return NextResponse.json(
        { error: "accountNumber is required" },
        { status: 400 },
      );
    }

    if (!billingMonth) {
      return NextResponse.json(
        { error: "billingMonth is required" },
        { status: 400 },
      );
    }

    if (invoiceNumber === null && customerVatNumber === null) {
      return NextResponse.json(
        { error: "invoiceNumber or customerVatNumber is required" },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, string> = {};
    if (invoiceNumber !== null) {
      if (!invoiceNumber) {
        return NextResponse.json(
          { error: "invoiceNumber cannot be empty" },
          { status: 400 },
        );
      }
      updatePayload.invoice_number = invoiceNumber;
    }
    if (customerVatNumber !== null) {
      updatePayload.customer_vat_number = customerVatNumber;
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("bulk_account_invoices")
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq("account_number", accountNumber)
      .eq("billing_month", billingMonth)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update bulk invoice number" },
        { status: 500 },
      );
    }

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error) {
    console.error("Unexpected error in bulk account invoice PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
