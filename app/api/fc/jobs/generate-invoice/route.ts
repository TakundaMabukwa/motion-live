import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAtomicInvoice } from "@/lib/server/invoice-number-audit";

const toCurrency = (v: unknown) => Number(v || 0);

const getAnnuityMultiplier = (job: Record<string, unknown>) => {
  const jobType = String(job?.job_type || job?.quotation_job_type || "").toLowerCase();
  const jobSubType = String(job?.job_sub_type || "").toLowerCase().replace(/[^a-z]/g, "");
  if (jobType.includes("reinstall") || jobSubType === "reinstall") return 1;
  const isInstall = jobType.includes("install") || jobType === "installation";
  if (!isInstall) return 1;
  const today = new Date();
  const day = today.getDate();
  if (day >= 28 || day <= 15) return 2;
  return 1;
};

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

    const annuityMultiplier = getAnnuityMultiplier(jobCard as Record<string, unknown>);

    const lineItems = products.flatMap((p: Record<string, unknown>) => {
      const qty = Math.max(1, Number(p.quantity) || 1);
      const cash = toCurrency(p.cash_price) || toCurrency(p.cash_gross);
      const rental = (toCurrency(p.rental_price) || toCurrency(p.rental_gross)) * annuityMultiplier;
      const sub = (toCurrency(p.subscription_price) || toCurrency(p.subscription_gross)) * annuityMultiplier;
      const install = toCurrency(p.installation_price) || toCurrency(p.installation_gross);
      const deinstall = toCurrency(p.de_installation_price) || toCurrency(p.de_installation_gross);
      const unitPrice = cash + install + deinstall;
      const productName = String(p.name || p.description || p.product_name || "");
      const productType = String(p.type || p.category || "");
      const rows: Record<string, unknown>[] = [];
      if (unitPrice > 0) {
        const vatAmount = unitPrice * 0.15;
        rows.push({
          description: productName,
          quantity: qty,
          unit_price: unitPrice,
          vat_amount: vatAmount,
          total_incl: (unitPrice + vatAmount) * qty,
          type: productType,
        });
      }
      if (rental > 0) {
        const vatAmount = rental * 0.15;
        rows.push({
          description: `${productName} - Rental`,
          quantity: qty,
          unit_price: rental,
          vat_amount: vatAmount,
          total_incl: (rental + vatAmount) * qty,
          type: productType,
          rental_amount: rental,
          annuity_multiplier: annuityMultiplier,
        });
      }
      if (sub > 0) {
        const vatAmount = sub * 0.15;
        rows.push({
          description: `${productName} - Subscription`,
          quantity: qty,
          unit_price: sub,
          vat_amount: vatAmount,
          total_incl: (sub + vatAmount) * qty,
          type: productType,
          subscription_amount: sub,
          annuity_multiplier: annuityMultiplier,
        });
      }
      if (rows.length === 0) {
        const fallbackAmt = unitPrice || rental || sub;
        const vatAmount = fallbackAmt * 0.15;
        rows.push({
          description: productName,
          quantity: qty,
          unit_price: fallbackAmt,
          vat_amount: vatAmount,
          total_incl: (fallbackAmt + vatAmount) * qty,
          type: productType,
        });
      }
      return rows;
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

    // Atomic: allocate number + insert invoice in one transaction. No gaps, no PENDING.
    const { invoice: insertedInvoice, reused } = await createAtomicInvoice(supabase, {
      source: "api/fc/jobs/generate-invoice",
      requestKey: jobCardId,
      userId: user.id,
      jobCardId,
      jobNumber: jobCard.job_number || null,
      quotationNumber: jobCard.quotation_number || null,
      accountNumber,
      clientName: jobCard.customer_name || null,
      clientEmail: jobCard.customer_email || null,
      clientPhone: jobCard.customer_phone || null,
      clientAddress: jobCard.customer_address || null,
      invoiceDate: resolvedInvoiceDate,
      dueDate: null,
      paymentTerms: null,
      notes: null,
      subtotal,
      vatAmount: totalVat,
      discountAmount: 0,
      totalAmount,
      lineItems,
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
        invoice_number: insertedInvoice.invoice_number,
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

    return NextResponse.json({ invoice: insertedInvoice, reused });
  } catch (error) {
    console.error("Error in FC generate invoice:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("unique constraint") || message.includes("duplicate key")) {
      return NextResponse.json({ error: "An invoice already exists for this job card. Please refresh and try again." }, { status: 409 });
    }
    if (message.includes("foreign key")) {
      return NextResponse.json({ error: "Job card not found. Please refresh and try again." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create invoice. Please try again." }, { status: 500 });
  }
}
