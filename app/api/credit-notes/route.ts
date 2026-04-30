import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  applyCreditToPeriodBuckets,
  buildInvoiceFinancials,
  normalizeBillingMonth,
} from "@/lib/server/account-invoice-payments";

const toNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeEventTimestamp = (value: unknown, fallback = new Date().toISOString()) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T12:00:00.000Z`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid credit note date");
  }

  return parsed.toISOString();
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accountNumber = String(body?.accountNumber || "").trim().toUpperCase();
    const requestedBillingMonth = normalizeBillingMonth(body?.billingMonth);
    const amount = toNumber(body?.amount);
    const reference = String(body?.reference || "").trim() || null;
    const comment = String(body?.comment || "").trim() || null;
    const dryRun = Boolean(body?.dryRun);
    let creditNoteDate: string;

    try {
      creditNoteDate = normalizeEventTimestamp(body?.creditNoteDate);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid credit note date" },
        { status: 400 },
      );
    }

    const billingMonth = requestedBillingMonth;

    if (!accountNumber) {
      return NextResponse.json({ error: "accountNumber is required" }, { status: 400 });
    }

    if (!billingMonth) {
      return NextResponse.json({ error: "billingMonth is required" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const createdByEmail = user.email || null;

    const [
      { data: invoiceRows, error: invoiceError },
      { data: mirrorRows, error: mirrorError },
      { data: costCenterRow, error: costCenterError },
    ] = await Promise.all([
      supabase
        .from("account_invoices")
        .select("*")
        .eq("account_number", accountNumber)
        .eq("billing_month", billingMonth)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("payments_")
        .select("*")
        .eq("cost_code", accountNumber)
        .eq("billing_month", billingMonth)
        .order("last_updated", { ascending: false })
        .limit(1),
      supabase
        .from("cost_centers")
        .select("cost_code, company, legal_name, vat_number, physical_address_1, physical_address_2, physical_address_3, physical_area, physical_code")
        .eq("cost_code", accountNumber)
        .maybeSingle(),
    ]);

    if (invoiceError || mirrorError || costCenterError) {
      const message =
        invoiceError?.message || mirrorError?.message || costCenterError?.message || "Database error";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const invoice = Array.isArray(invoiceRows) ? invoiceRows[0] || null : null;
    const paymentsMirror = Array.isArray(mirrorRows) ? mirrorRows[0] || null : null;

    const bucketSource = paymentsMirror || {
      current_due: invoice?.balance_due ?? invoice?.total_amount ?? 0,
      overdue_30_days: 0,
      overdue_60_days: 0,
      overdue_90_days: 0,
      overdue_120_plus_days: 0,
      outstanding_balance: invoice?.balance_due ?? invoice?.total_amount ?? 0,
      paid_amount: invoice?.paid_amount ?? 0,
      credit_amount: 0,
    };

    const bucketApplication = applyCreditToPeriodBuckets(bucketSource, amount);
    const appliedAmount = bucketApplication.appliedToPeriod;
    const unappliedAmount = bucketApplication.remainingCredit;

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        accountNumber,
        billingMonth,
        source: {
          invoice_id: invoice?.id || null,
          payments_mirror_id: paymentsMirror?.id || null,
          client_name:
            invoice?.company_name ||
            paymentsMirror?.company ||
            costCenterRow?.legal_name ||
            costCenterRow?.company ||
            accountNumber,
        },
        before: {
          current_due: toNumber(bucketSource.current_due),
          overdue_30_days: toNumber(bucketSource.overdue_30_days),
          overdue_60_days: toNumber(bucketSource.overdue_60_days),
          overdue_90_days: toNumber(bucketSource.overdue_90_days),
          overdue_120_plus_days: toNumber(bucketSource.overdue_120_plus_days),
          outstanding_balance: toNumber(bucketSource.outstanding_balance),
          paid_amount: toNumber(bucketSource.paid_amount),
          credit_amount: toNumber(bucketSource.credit_amount),
        },
        after: {
          current_due: bucketApplication.current_due,
          overdue_30_days: bucketApplication.overdue_30_days,
          overdue_60_days: bucketApplication.overdue_60_days,
          overdue_90_days: bucketApplication.overdue_90_days,
          overdue_120_plus_days: bucketApplication.overdue_120_plus_days,
          outstanding_balance: bucketApplication.outstanding_balance,
        },
        appliedAmount,
        unappliedAmount,
        reference,
        comment,
        creditNoteDate,
      });
    }

    const { data: allocatedCreditNoteNumber, error: numberError } = await supabase.rpc(
      "allocate_document_number",
      {
        sequence_name: "credit_note",
        prefix: "CN-",
      },
    );

    if (numberError || !allocatedCreditNoteNumber) {
      return NextResponse.json(
        { error: numberError?.message || "Failed to allocate credit note number" },
        { status: 500 },
      );
    }

    const clientName =
      invoice?.company_name ||
      paymentsMirror?.company ||
      costCenterRow?.legal_name ||
      costCenterRow?.company ||
      accountNumber;

    const { data: insertedCreditNote, error: creditNoteError } = await supabase
      .from("credit_notes")
      .insert({
        credit_note_number: allocatedCreditNoteNumber,
        account_number: accountNumber,
        client_name: clientName,
        billing_month_applies_to: billingMonth,
        credit_note_date: creditNoteDate,
        amount,
        applied_amount: appliedAmount,
        unapplied_amount: unappliedAmount,
        reference,
        comment,
        reason: "Manual credit note applied to billing period",
        status: "applied",
        account_invoice_id: invoice?.id || null,
        created_by: user.id,
        created_by_email: createdByEmail,
      })
      .select("*")
      .single();

    if (creditNoteError) {
      return NextResponse.json(
        { error: creditNoteError.message || "Failed to create credit note" },
        { status: 500 },
      );
    }

    const { error: applicationError } = await supabase.from("credit_note_applications").insert({
      credit_note_id: insertedCreditNote.id,
      account_number: accountNumber,
      billing_month: billingMonth,
      account_invoice_id: invoice?.id || null,
      applied_to: "billing_period",
      amount: appliedAmount,
      bucket_application: {
        current_due: bucketApplication.current_due,
        overdue_30_days: bucketApplication.overdue_30_days,
        overdue_60_days: bucketApplication.overdue_60_days,
        overdue_90_days: bucketApplication.overdue_90_days,
        overdue_120_plus_days: bucketApplication.overdue_120_plus_days,
        outstanding_balance: bucketApplication.outstanding_balance,
      },
      reference,
      comment,
      created_by: user.id,
      created_by_email: createdByEmail,
    });

    if (applicationError) {
      return NextResponse.json(
        { error: applicationError.message || "Failed to record credit note application" },
        { status: 500 },
      );
    }

    let updatedInvoice = invoice;
    if (invoice) {
      const currentCreditAmount = toNumber(invoice.credit_amount);
      const nextCreditAmount = Number((currentCreditAmount + appliedAmount).toFixed(2));
      const effectivePaidAmount = toNumber(invoice.paid_amount) + nextCreditAmount;
      const financials = buildInvoiceFinancials({
        totalAmount: invoice.total_amount,
        paidAmount: effectivePaidAmount,
        dueDate: invoice.due_date,
      });

      const { data: invoiceUpdate, error: invoiceUpdateError } = await supabase
        .from("account_invoices")
        .update({
          credit_amount: nextCreditAmount,
          balance_due: financials.balanceDue,
          payment_status: financials.paymentStatus,
          fully_paid_at:
            financials.balanceDue <= 0
              ? invoice.fully_paid_at || creditNoteDate
              : null,
        })
        .eq("id", invoice.id)
        .select("*")
        .single();

      if (invoiceUpdateError) {
        return NextResponse.json(
          { error: invoiceUpdateError.message || "Failed to update invoice balance" },
          { status: 500 },
        );
      }

      updatedInvoice = invoiceUpdate;
    }

    const currentMirrorCredit = toNumber(paymentsMirror?.credit_amount);
    const nextMirrorCredit = Number((currentMirrorCredit + amount).toFixed(2));
    const effectiveMirrorPaid =
      toNumber(paymentsMirror?.paid_amount) + (updatedInvoice ? toNumber(updatedInvoice.credit_amount) : appliedAmount);
    const mirrorStatus =
      bucketApplication.outstanding_balance <= 0
        ? "paid"
        : effectiveMirrorPaid > 0
          ? "partial"
          : String(paymentsMirror?.payment_status || updatedInvoice?.payment_status || "pending");

    if (paymentsMirror?.id) {
      const { error: mirrorUpdateError } = await supabase
        .from("payments_")
        .update({
          account_invoice_id: updatedInvoice?.id || paymentsMirror.account_invoice_id || null,
          invoice_number: updatedInvoice?.invoice_number || paymentsMirror.invoice_number || null,
          reference:
            updatedInvoice?.invoice_number ||
            paymentsMirror.reference ||
            paymentsMirror.invoice_number ||
            null,
          due_amount: toNumber(updatedInvoice?.total_amount || paymentsMirror.due_amount),
          balance_due: bucketApplication.outstanding_balance,
          amount_due: bucketApplication.outstanding_balance,
          current_due: bucketApplication.current_due,
          overdue_30_days: bucketApplication.overdue_30_days,
          overdue_60_days: bucketApplication.overdue_60_days,
          overdue_90_days: bucketApplication.overdue_90_days,
          overdue_120_plus_days: bucketApplication.overdue_120_plus_days,
          outstanding_balance: bucketApplication.outstanding_balance,
          credit_amount: nextMirrorCredit,
          payment_status: mirrorStatus,
          invoice_date:
            updatedInvoice?.invoice_date ||
            paymentsMirror.invoice_date ||
            new Date().toISOString(),
          due_date: updatedInvoice?.due_date || paymentsMirror.due_date || null,
          company:
            updatedInvoice?.company_name ||
            paymentsMirror.company ||
            costCenterRow?.legal_name ||
            costCenterRow?.company ||
            accountNumber,
          billing_month: billingMonth,
          last_updated: creditNoteDate,
        })
        .eq("id", paymentsMirror.id);

      if (mirrorUpdateError) {
        return NextResponse.json(
          { error: mirrorUpdateError.message || "Failed to update age analysis" },
          { status: 500 },
        );
      }
    } else {
      const { error: mirrorInsertError } = await supabase.from("payments_").insert({
        company: clientName,
        cost_code: accountNumber,
        account_invoice_id: updatedInvoice?.id || null,
        invoice_number: updatedInvoice?.invoice_number || null,
        reference: updatedInvoice?.invoice_number || null,
        due_amount: toNumber(updatedInvoice?.total_amount || 0),
        paid_amount: toNumber(updatedInvoice?.paid_amount || 0),
        balance_due: bucketApplication.outstanding_balance,
        amount_due: bucketApplication.outstanding_balance,
        payment_status: mirrorStatus,
        invoice_date: updatedInvoice?.invoice_date || new Date().toISOString(),
        due_date: updatedInvoice?.due_date || null,
        current_due: bucketApplication.current_due,
        overdue_30_days: bucketApplication.overdue_30_days,
        overdue_60_days: bucketApplication.overdue_60_days,
        overdue_90_days: bucketApplication.overdue_90_days,
        overdue_120_plus_days: bucketApplication.overdue_120_plus_days,
        outstanding_balance: bucketApplication.outstanding_balance,
        credit_amount: nextMirrorCredit,
        billing_month: billingMonth,
        last_updated: creditNoteDate,
      });

      if (mirrorInsertError) {
        return NextResponse.json(
          { error: mirrorInsertError.message || "Failed to create age analysis row" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      creditNote: insertedCreditNote,
      audit: {
        created_by: user.id,
        created_by_email: createdByEmail,
      },
      appliedAmount,
      unappliedAmount,
      updatedBalanceDue: bucketApplication.outstanding_balance,
    });
  } catch (error) {
    console.error("Credit note processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
