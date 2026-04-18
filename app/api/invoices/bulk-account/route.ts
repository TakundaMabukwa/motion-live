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
  return new Date(year, month, invoiceDay, 23, 59, 59, 999).toISOString();
};

const resolveLockBillingMonth = (
  lockDate: unknown,
  requestedBillingMonth: string | null,
) => {
  const normalizedLockMonth = normalizeBillingMonth(lockDate);
  if (!normalizedLockMonth) {
    return null;
  }

  const targetYear = String(
    normalizeBillingMonth(requestedBillingMonth) || normalizedLockMonth,
  ).slice(0, 4);
  const targetMonth = String(normalizedLockMonth).slice(5, 7);
  return `${targetYear}-${targetMonth}-01`;
};

const buildAddress = (source?: Record<string, unknown> | null) =>
  [
    source?.physical_address_1,
    source?.physical_address_2,
    source?.physical_address_3,
    source?.physical_area,
    source?.physical_province,
    source?.physical_code,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");

const enrichBulkInvoiceWithLockMeta = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoice: Record<string, unknown> | null,
) => {
  if (!invoice) {
    return null;
  }

  const lockedBy = String(invoice?.invoice_locked_by || '').trim();
  const preservedInvoiceDate = String(invoice?.invoice_date || "").trim();
  const normalizedInvoiceDate = preservedInvoiceDate || getBillingInvoiceDate(invoice?.billing_month);
  const accountNumber = String(invoice?.account_number || "").trim();

  let costCenter: Record<string, unknown> | null = null;
  if (accountNumber) {
    const { data: costCenterRows, error: costCenterError } = await supabase
      .from("cost_centers")
      .select("*")
      .eq("cost_code", accountNumber)
      .order("created_at", { ascending: false })
      .limit(1);

    if (costCenterError) {
      console.error("Failed to refresh cost center invoice metadata:", costCenterError);
    } else {
      costCenter = Array.isArray(costCenterRows) ? costCenterRows[0] || null : null;
    }
  }

  const refreshedInvoice = {
    ...invoice,
    company_name:
      costCenter?.company ||
      costCenter?.legal_name ||
      invoice?.company_name ||
      null,
    client_address:
      buildAddress(costCenter) ||
      String(invoice?.client_address || "").trim() ||
      null,
    customer_vat_number:
      String(costCenter?.vat_number || "").trim() ||
      String(invoice?.customer_vat_number || "").trim() ||
      null,
    company_registration_number:
      String(costCenter?.registration_number || "").trim() ||
      String(invoice?.company_registration_number || "").trim() ||
      null,
  };

  if (!lockedBy) {
    return {
      ...refreshedInvoice,
      invoice_date: normalizedInvoiceDate,
      invoice_locked_by_email: null,
    };
  }

  const { data: lockedUser } = await supabase
    .from('users')
    .select('email')
    .eq('id', lockedBy)
    .maybeSingle();

  return {
    ...refreshedInvoice,
    invoice_date: normalizedInvoiceDate,
    invoice_locked_by_email: lockedUser?.email || null,
  };
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
    const requestedBillingMonth = normalizeBillingMonth(searchParams.get("billingMonth"));

    if (!accountNumber) {
      return NextResponse.json(
        { error: "accountNumber is required" },
        { status: 400 },
      );
    }

    const { data: systemLockRows, error: systemLockError } = await supabase
      .from("system_locks")
      .select("is_locked, lock_date")
      .eq("lock_key", "billing")
      .limit(1);

    if (systemLockError) {
      return NextResponse.json(
        { error: systemLockError.message || "Failed to fetch system lock" },
        { status: 500 },
      );
    }

    const systemLock = Array.isArray(systemLockRows) ? systemLockRows[0] || null : null;
    const lockedBillingMonth = Boolean(systemLock?.is_locked)
      ? resolveLockBillingMonth(systemLock?.lock_date, requestedBillingMonth)
      : null;

    const fetchInvoiceForBillingMonth = async (targetBillingMonth: string | null) => {
      let query = supabase
        .from("bulk_account_invoices")
        .select("*")
        .eq("account_number", accountNumber)
        .order("billing_month", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1);

      query = targetBillingMonth
        ? query.eq("billing_month", targetBillingMonth)
        : query;

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      return Array.isArray(data) ? data[0] || null : null;
    };

    const fetchLatestInvoiceForAccount = async () => {
      const { data, error } = await supabase
        .from("bulk_account_invoices")
        .select("*")
        .eq("account_number", accountNumber)
        .order("billing_month", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      return Array.isArray(data) ? data[0] || null : null;
    };

    let rawInvoice = null;
    let resolvedBillingMonth = requestedBillingMonth || null;

    try {
      rawInvoice = await fetchInvoiceForBillingMonth(requestedBillingMonth || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch bulk account invoice";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    if (!rawInvoice && lockedBillingMonth && lockedBillingMonth !== requestedBillingMonth) {
      try {
        rawInvoice = await fetchInvoiceForBillingMonth(lockedBillingMonth);
        if (rawInvoice) {
          resolvedBillingMonth = lockedBillingMonth;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch locked-period bulk invoice";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    if (!rawInvoice) {
      try {
        rawInvoice = await fetchLatestInvoiceForAccount();
        if (rawInvoice) {
          resolvedBillingMonth = normalizeBillingMonth(rawInvoice?.billing_month);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch latest bulk invoice";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    const invoice = await enrichBulkInvoiceWithLockMeta(supabase, rawInvoice);

    return NextResponse.json({
      invoice,
      requestedBillingMonth,
      resolvedBillingMonth,
      lockedBillingMonth,
    });
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
    const allowLockedRebuild = Boolean(body?.allowLockedRebuild);
    const canOverrideLockedInvoice = allowLockedRebuild;

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

    if (existingInvoice?.invoice_locked && !canOverrideLockedInvoice) {
      const lockedInvoice = await enrichBulkInvoiceWithLockMeta(supabase, existingInvoice);
      return NextResponse.json({ invoice: lockedInvoice, reused: true, locked: true });
    }

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
          "allocate_document_number",
          {
            sequence_name: "invoice",
            prefix: "INV",
          },
        );

        if (numberError || !allocatedInvoiceNumber) {
          return NextResponse.json(
            { error: numberError?.message || "Failed to allocate invoice number" },
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

      const enrichedInvoice = await enrichBulkInvoiceWithLockMeta(supabase, updatedInvoice);
      return NextResponse.json({ invoice: enrichedInvoice, reused: true });
    }

    const { data: allocatedInvoiceNumber, error: numberError } = await supabase.rpc(
      "allocate_document_number",
      {
        sequence_name: "invoice",
        prefix: "INV",
      },
    );

    if (numberError || !allocatedInvoiceNumber) {
      return NextResponse.json(
        { error: numberError?.message || "Failed to allocate invoice number" },
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

    const enrichedInvoice = await enrichBulkInvoiceWithLockMeta(supabase, insertedInvoice);
    return NextResponse.json({ invoice: enrichedInvoice, reused: false });
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
    const invoiceLocked =
      body?.invoiceLocked === undefined ? undefined : Boolean(body.invoiceLocked);

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
      companyRegistrationNumber === null &&
      invoiceLocked === undefined
    ) {
      return NextResponse.json(
        { error: "At least one editable field is required" },
        { status: 400 },
      );
    }

    const { data: currentInvoice, error: currentInvoiceError } = await supabase
      .from("bulk_account_invoices")
      .select("*")
      .eq("account_number", accountNumber)
      .eq("billing_month", billingMonth)
      .maybeSingle();

    if (currentInvoiceError) {
      return NextResponse.json(
        { error: currentInvoiceError.message || "Failed to fetch bulk invoice" },
        { status: 500 },
      );
    }

    if (!currentInvoice) {
      return NextResponse.json(
        { error: "Bulk invoice not found" },
        { status: 404 },
      );
    }

    if (currentInvoice.invoice_locked && invoiceLocked === undefined) {
      const lockedInvoice = await enrichBulkInvoiceWithLockMeta(supabase, currentInvoice);
      return NextResponse.json(
        { error: "Invoice is locked", invoice: lockedInvoice, locked: true },
        { status: 409 },
      );
    }

    const updatePayload: Record<string, string | boolean | null> = {};
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
    if (invoiceLocked !== undefined) {
      updatePayload.invoice_locked = invoiceLocked;
      updatePayload.invoice_locked_by = invoiceLocked ? user.id : null;
      updatePayload.invoice_locked_at = invoiceLocked ? new Date().toISOString() : null;
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("bulk_account_invoices")
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentInvoice.id)
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

    const enrichedInvoice = await enrichBulkInvoiceWithLockMeta(supabase, updatedInvoice);
    return NextResponse.json({ invoice: enrichedInvoice });
  } catch (error) {
    console.error("Unexpected error in bulk account invoice PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
