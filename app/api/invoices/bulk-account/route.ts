import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildInvoiceFinancials,
  defaultDueDate,
  normalizeBillingMonth,
  upsertPaymentsMirror,
} from "@/lib/server/account-invoice-payments";

const hasRealInvoiceNumber = (value: unknown) => {
  const normalized = String(value || "").trim().toUpperCase();
  return Boolean(normalized) && normalized !== "PENDING";
};

const getBillingInvoiceDate = (billingMonth: unknown) => {
  if (!billingMonth) {
    return new Date().toISOString();
  }

  const normalized = String(billingMonth).slice(0, 7) + '-01T00:00:00';
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  const year = parsed.getFullYear();
  const month = parsed.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const invoiceDay = Math.min(30, lastDay);
  return new Date(year, month, invoiceDay).toISOString();
};

const syncBulkInvoiceToAccountInvoices = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    bulkInvoice,
    userId,
  }: {
    bulkInvoice: Record<string, unknown>;
    userId?: string | null;
  },
) => {
  const accountNumber = String(bulkInvoice?.account_number || "").trim();
  const billingMonth = normalizeBillingMonth(bulkInvoice?.billing_month);

  if (!accountNumber) {
    return null;
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

  const { data: existingRows, error: existingError } = await existingQuery;
  if (existingError) {
    throw existingError;
  }

  const existingInvoice = Array.isArray(existingRows) ? existingRows[0] || null : null;
  const invoiceDate = String(bulkInvoice?.invoice_date || getBillingInvoiceDate(billingMonth));
  const dueDate = existingInvoice?.due_date || defaultDueDate(invoiceDate);
  const existingPaidAmount = Number(existingInvoice?.paid_amount || 0);
  const financials = buildInvoiceFinancials({
    totalAmount: bulkInvoice?.total_amount,
    paidAmount: existingPaidAmount,
    dueDate,
  });

  const payload = {
    account_number: accountNumber,
    billing_month: billingMonth,
    invoice_number: String(bulkInvoice?.invoice_number || "").trim(),
    company_name: bulkInvoice?.company_name || null,
    client_address: bulkInvoice?.client_address || null,
    customer_vat_number: bulkInvoice?.customer_vat_number || null,
    company_registration_number: bulkInvoice?.company_registration_number || null,
    invoice_date: invoiceDate,
    due_date: dueDate,
    subtotal: Number(bulkInvoice?.subtotal || 0),
    vat_amount: Number(bulkInvoice?.vat_amount || 0),
    discount_amount: Number(bulkInvoice?.discount_amount || 0),
    total_amount: financials.totalAmount,
    paid_amount: financials.paidAmount,
    balance_due: financials.balanceDue,
    payment_status: financials.paymentStatus,
    line_items: Array.isArray(bulkInvoice?.line_items) ? bulkInvoice.line_items : [],
    notes: bulkInvoice?.notes || null,
  };

  if (existingInvoice?.id) {
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("account_invoices")
      .update(payload)
      .eq("id", existingInvoice.id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    await upsertPaymentsMirror(supabase, updatedInvoice);
    return updatedInvoice;
  }

  const { data: insertedInvoice, error: insertError } = await supabase
    .from("account_invoices")
    .insert({
      ...payload,
      created_by: userId || null,
    })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  await upsertPaymentsMirror(supabase, insertedInvoice);
  return insertedInvoice;
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
      .order("billing_month", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (billingMonth) {
      query = query.eq("billing_month", billingMonth);
    }

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
    const invoiceDate = body?.invoiceDate || getBillingInvoiceDate(billingMonth);

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
      company_registration_number: body?.companyRegistrationNumber || null,
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
      let invoiceNumberToKeep = existingInvoice.invoice_number;

      if (!hasRealInvoiceNumber(invoiceNumberToKeep)) {
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

        invoiceNumberToKeep = allocatedInvoiceNumber;
      }

      const { data: updatedInvoice, error: updateError } = await supabase
        .from("bulk_account_invoices")
        .update({
          ...payload,
          invoice_number: invoiceNumberToKeep,
        })
        .eq("id", existingInvoice.id)
        .select("*")
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Failed to update bulk invoice" },
          { status: 500 },
        );
      }

      try {
        await syncBulkInvoiceToAccountInvoices(supabase, {
          bulkInvoice: updatedInvoice,
          userId: user.id,
        });
      } catch (syncError) {
        console.error("Failed to sync bulk invoice to account_invoices:", syncError);
        return NextResponse.json(
          {
            error:
              syncError instanceof Error
                ? syncError.message
                : "Failed to sync bulk invoice to account invoices",
          },
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

    try {
      await syncBulkInvoiceToAccountInvoices(supabase, {
        bulkInvoice: insertedInvoice,
        userId: user.id,
      });
    } catch (syncError) {
      console.error("Failed to sync bulk invoice to account_invoices:", syncError);
      return NextResponse.json(
        {
          error:
            syncError instanceof Error
              ? syncError.message
              : "Failed to sync bulk invoice to account invoices",
        },
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
    const companyName = body?.companyName === undefined ? null : String(body.companyName || "").trim();
    const companyRegistrationNumber =
      body?.companyRegistrationNumber === undefined ? null : String(body.companyRegistrationNumber || "").trim();

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

    if (
      invoiceNumber === null &&
      customerVatNumber === null &&
      companyName === null &&
      companyRegistrationNumber === null
    ) {
      return NextResponse.json(
        { error: "At least one editable field is required" },
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
    if (companyName !== null) {
      updatePayload.company_name = companyName;
    }
    if (companyRegistrationNumber !== null) {
      updatePayload.company_registration_number = companyRegistrationNumber;
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

    try {
      await syncBulkInvoiceToAccountInvoices(supabase, {
        bulkInvoice: updatedInvoice,
        userId: user.id,
      });
    } catch (syncError) {
      console.error("Failed to sync edited bulk invoice to account_invoices:", syncError);
      return NextResponse.json(
        {
          error:
            syncError instanceof Error
              ? syncError.message
              : "Failed to sync edited bulk invoice to account invoices",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error) {
    console.error("Unexpected error in bulk account invoice PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
