import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  allocateTrackedInvoiceNumber,
  markTrackedInvoicePersisted,
  markTrackedInvoiceFailed,
} from "@/lib/server/invoice-number-audit";

const toCurrency = (v: unknown) => Number(v || 0);

const parseProducts = (val: unknown): Record<string, unknown>[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return []; } }
  return [];
};

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
    const jobCardId = String(body.jobCardId || "").trim();
    const invoiceDate = String(body.invoiceDate || "").trim();

    if (!jobCardId) {
      return NextResponse.json({ error: "jobCardId is required" }, { status: 400 });
    }

    // Fetch the job card
    const { data: jobCard, error: jobCardError } = await supabase
      .from("job_cards")
      .select("*")
      .eq("id", jobCardId)
      .single();

    if (jobCardError || !jobCard) {
      return NextResponse.json(
        { error: jobCardError?.message || "Job card not found" },
        { status: 404 },
      );
    }

    // Check for existing invoice (idempotent)
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("*")
      .eq("job_card_id", jobCardId)
      .order("created_at", { ascending: false })
      .limit(1);

    const existingInvoice = Array.isArray(existingInvoices) ? existingInvoices[0] || null : null;

    if (existingInvoice) {
      return NextResponse.json({ invoice: existingInvoice, reused: true });
    }

    // Check billing_statuses guard
    const billing = jobCard.billing_statuses;
    if (billing && typeof billing === "object") {
      const inv = (billing as Record<string, unknown>).invoice;
      if (inv === true) {
        return NextResponse.json({ error: "Job card is already marked as invoiced" }, { status: 409 });
      }
      if (typeof inv === "object" && inv !== null) {
        const invObj = inv as Record<string, unknown>;
        if (invObj.done === true || invObj.invoice_id || invObj.invoice_number) {
          return NextResponse.json({ error: "Job card billing status already has an invoice" }, { status: 409 });
        }
      }
    }

    // Build line items from quotation_products
    const products = parseProducts(jobCard.quotation_products).filter(
      (p: Record<string, unknown>) => p && typeof p === "object",
    );

    const lineItems = products.map((p: Record<string, unknown>) => {
      const qty = Math.max(1, Number(p.quantity) || 1);
      const cash = toCurrency(p.cash_price);
      const rental = toCurrency(p.rental_price);
      const sub = toCurrency(p.subscription_price);
      const install = toCurrency(p.installation_price);
      const deinstall = toCurrency(p.de_installation_price);
      const unitPrice = cash + rental + sub + install + deinstall;
      const vatAmount = unitPrice * 0.15;
      return {
        description: String(p.name || p.description || p.product_name || ""),
        quantity: qty,
        unit_price: unitPrice,
        vat_amount: vatAmount,
        total_incl: (unitPrice + vatAmount) * qty,
        type: String(p.type || p.category || ""),
      };
    });

    // If no products, create a fallback line item
    if (lineItems.length === 0) {
      const totalAmt = toCurrency(jobCard.quotation_total_amount);
      const vatAmt = totalAmt * 0.15;
      lineItems.push({
        description: jobCard.job_description || jobCard.job_type || "Job service",
        quantity: 1,
        unit_price: totalAmt,
        vat_amount: vatAmt,
        total_incl: totalAmt + vatAmt,
        type: jobCard.job_type || "",
      });
    }

    const subtotal = lineItems.reduce((s, item) => s + (item.unit_price * item.quantity), 0);
    const totalVat = lineItems.reduce((s, item) => s + (item.vat_amount * item.quantity), 0);
    const totalAmount = lineItems.reduce((s, item) => s + item.total_incl, 0);

    // Resolve invoice date
    const resolvedInvoiceDate = invoiceDate
      ? new Date(`${invoiceDate}T12:00:00+02:00`).toISOString()
      : new Date().toISOString();

    const accountNumber = String(jobCard.new_account_number || "").trim().toUpperCase();

    const payload = {
      job_card_id: jobCardId,
      job_number: jobCard.job_number || null,
      quotation_number: jobCard.quotation_number || null,
      account_number: accountNumber,
      client_name: jobCard.customer_name || null,
      client_email: jobCard.customer_email || null,
      client_phone: jobCard.customer_phone || null,
      client_address: jobCard.customer_address || null,
      invoice_date: resolvedInvoiceDate,
      due_date: null,
      payment_terms: null,
      notes: null,
      subtotal,
      vat_amount: totalVat,
      discount_amount: 0,
      total_amount: totalAmount,
      line_items: lineItems,
    };

    // Allocate invoice number (idempotent — uses jobCardId as requestKey)
    let allocatedInvoiceNumber = "";
    let allocationAuditId: string | null = null;

    try {
      const allocation = await allocateTrackedInvoiceNumber(supabase, {
        source: "api/fc/jobs/generate-invoice",
        userId: user.id,
        requestKey: jobCardId,
        context: { jobCardId, jobNumber: jobCard.job_number || null, accountNumber },
      });
      allocatedInvoiceNumber = allocation.invoiceNumber;
      allocationAuditId = allocation.auditId;
    } catch (allocationError) {
      console.error("Error allocating invoice number:", allocationError);
      return NextResponse.json({ error: "Failed to allocate invoice number" }, { status: 500 });
    }

    // Insert the invoice record
    const { data: insertedInvoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        ...payload,
        invoice_number: allocatedInvoiceNumber,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error inserting invoice:", insertError);
      await markTrackedInvoiceFailed(supabase, {
        auditId: allocationAuditId,
        invoiceNumber: allocatedInvoiceNumber,
        errorMessage: insertError.message || "Failed to insert invoice",
      });
      return NextResponse.json(
        { error: "Failed to create invoice", details: insertError.message },
        { status: 500 },
      );
    }

    // Mark as persisted in audit trail
    await markTrackedInvoicePersisted(supabase, {
      auditId: allocationAuditId,
      invoiceNumber: allocatedInvoiceNumber,
      persistedTable: "invoices",
      persistedInvoiceId: insertedInvoice.id,
    });

    // Update job card billing_statuses
    const existingBilling = jobCard.billing_statuses && typeof jobCard.billing_statuses === "object"
      ? jobCard.billing_statuses
      : {};
    const updatedBilling = {
      ...(existingBilling as Record<string, unknown>),
      invoice: {
        done: true,
        invoice_id: insertedInvoice.id,
        invoice_number: allocatedInvoiceNumber,
        date: resolvedInvoiceDate,
        generated_by: "fc",
      },
    };

    await supabase
      .from("job_cards")
      .update({
        billing_statuses: updatedBilling,
        job_status: "Invoiced",
        status: "invoiced",
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", jobCardId);

    return NextResponse.json({ invoice: insertedInvoice, reused: false });
  } catch (error) {
    console.error("Error in FC generate invoice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
