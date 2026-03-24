import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  buildInvoiceFinancials,
  normalizeBillingMonth,
  resolveAccountInvoice,
  upsertPaymentsMirror,
} from "@/lib/server/account-invoice-payments";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const {
      accountNumber,
      accountInvoiceId,
      billingMonth,
      paymentReference,
      amount,
      paymentMethod,
      notes,
      paymentType,
    } = requestBody;

    if (!paymentReference || !String(paymentReference).trim()) {
      return NextResponse.json(
        { error: "Payment reference is required" },
        { status: 400 },
      );
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    if (numericAmount > 1000000) {
      return NextResponse.json(
        { error: "Amount seems unreasonably high. Please verify the payment amount." },
        { status: 400 },
      );
    }

    if (paymentType !== "cost_center_payment") {
      return NextResponse.json(
        { error: "Unsupported payment type" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const invoice = await resolveAccountInvoice(supabase, {
      accountInvoiceId: accountInvoiceId ? String(accountInvoiceId) : null,
      accountNumber: accountNumber ? String(accountNumber).trim() : null,
      billingMonth: normalizeBillingMonth(billingMonth),
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "No invoice found for this account and billing month" },
        { status: 404 },
      );
    }

    const currentBalance = Number(invoice.balance_due ?? invoice.total_amount ?? 0);
    if (numericAmount > currentBalance) {
      return NextResponse.json(
        {
          error: `Payment amount cannot exceed current balance due (${currentBalance.toFixed(2)})`,
        },
        { status: 400 },
      );
    }

    const paymentInsert = {
      account_invoice_id: invoice.id,
      account_number: invoice.account_number,
      billing_month: invoice.billing_month,
      invoice_number: invoice.invoice_number,
      payment_reference: String(paymentReference).trim(),
      amount: numericAmount,
      payment_date: new Date().toISOString(),
      payment_method: paymentMethod ? String(paymentMethod).trim() : null,
      notes: notes ? String(notes).trim() : null,
      created_by: user?.id || null,
    };

    const { data: insertedPayment, error: insertError } = await supabase
      .from("account_invoice_payments")
      .insert(paymentInsert)
      .select("*")
      .single();

    if (insertError) {
      console.error("Failed to insert account invoice payment:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to record payment" },
        { status: 500 },
      );
    }

    const { data: paymentRows, error: paymentsError } = await supabase
      .from("account_invoice_payments")
      .select("amount")
      .eq("account_invoice_id", invoice.id);

    if (paymentsError) {
      console.error("Failed to total account invoice payments:", paymentsError);
      return NextResponse.json(
        { error: paymentsError.message || "Failed to total payments" },
        { status: 500 },
      );
    }

    const totalPaid = (paymentRows || []).reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0,
    );

    const financials = buildInvoiceFinancials({
      totalAmount: invoice.total_amount,
      paidAmount: totalPaid,
      dueDate: invoice.due_date,
    });

    const invoiceUpdatePayload = {
      paid_amount: financials.paidAmount,
      balance_due: financials.balanceDue,
      payment_status: financials.paymentStatus,
      last_payment_at: insertedPayment.payment_date,
      last_payment_reference: insertedPayment.payment_reference,
      fully_paid_at:
        financials.balanceDue <= 0
          ? invoice.fully_paid_at || new Date().toISOString()
          : null,
    };

    const { data: updatedInvoice, error: updateInvoiceError } = await supabase
      .from("account_invoices")
      .update(invoiceUpdatePayload)
      .eq("id", invoice.id)
      .select("*")
      .single();

    if (updateInvoiceError) {
      console.error("Failed to update account invoice payment state:", updateInvoiceError);
      return NextResponse.json(
        { error: updateInvoiceError.message || "Failed to update invoice" },
        { status: 500 },
      );
    }

    await upsertPaymentsMirror(supabase, updatedInvoice);

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      payment: {
        ...updatedInvoice,
        account_invoice_id: updatedInvoice.id,
        invoice_number: updatedInvoice.invoice_number,
      },
      paymentEntry: insertedPayment,
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
