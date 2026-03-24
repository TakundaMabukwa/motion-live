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
    const { payments, paymentReference, paymentMethod, notes } = requestBody;

    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid payments array" },
        { status: 400 },
      );
    }

    if (!paymentReference || !String(paymentReference).trim()) {
      return NextResponse.json(
        { error: "Payment reference is required for bulk payments" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const results = [];
    const errors = [];
    let successCount = 0;

    for (const payment of payments) {
      try {
        const amount = Number(payment.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          errors.push(`${payment.accountNumber || "unknown"}: invalid amount`);
          continue;
        }

        const invoice = await resolveAccountInvoice(supabase, {
          accountInvoiceId: payment.accountInvoiceId
            ? String(payment.accountInvoiceId)
            : null,
          accountNumber: payment.accountNumber ? String(payment.accountNumber).trim() : null,
          billingMonth: normalizeBillingMonth(payment.billingMonth),
        });

        if (!invoice) {
          errors.push(`${payment.accountNumber || "unknown"}: invoice not found`);
          continue;
        }

        const currentBalance = Number(invoice.balance_due ?? invoice.total_amount ?? 0);
        if (amount > currentBalance) {
          errors.push(
            `${invoice.account_number}: payment exceeds current balance (${currentBalance.toFixed(2)})`,
          );
          continue;
        }

        const { data: insertedPayment, error: insertError } = await supabase
          .from("account_invoice_payments")
          .insert({
            account_invoice_id: invoice.id,
            account_number: invoice.account_number,
            billing_month: invoice.billing_month,
            invoice_number: invoice.invoice_number,
            payment_reference: String(paymentReference).trim(),
            amount,
            payment_date: new Date().toISOString(),
            payment_method: paymentMethod ? String(paymentMethod).trim() : null,
            notes: notes ? String(notes).trim() : null,
            created_by: user?.id || null,
          })
          .select("*")
          .single();

        if (insertError) {
          errors.push(`${invoice.account_number}: ${insertError.message}`);
          continue;
        }

        const { data: paymentRows, error: paymentRowsError } = await supabase
          .from("account_invoice_payments")
          .select("amount")
          .eq("account_invoice_id", invoice.id);

        if (paymentRowsError) {
          errors.push(`${invoice.account_number}: ${paymentRowsError.message}`);
          continue;
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

        const { data: updatedInvoice, error: updateInvoiceError } = await supabase
          .from("account_invoices")
          .update({
            paid_amount: financials.paidAmount,
            balance_due: financials.balanceDue,
            payment_status: financials.paymentStatus,
            last_payment_at: insertedPayment.payment_date,
            last_payment_reference: insertedPayment.payment_reference,
            fully_paid_at:
              financials.balanceDue <= 0
                ? invoice.fully_paid_at || new Date().toISOString()
                : null,
          })
          .eq("id", invoice.id)
          .select("*")
          .single();

        if (updateInvoiceError) {
          errors.push(`${invoice.account_number}: ${updateInvoiceError.message}`);
          continue;
        }

        await upsertPaymentsMirror(supabase, updatedInvoice);

        results.push({
          accountNumber: invoice.account_number,
          amount,
          success: true,
          payment: {
            ...updatedInvoice,
            account_invoice_id: updatedInvoice.id,
          },
        });
        successCount++;
      } catch (error) {
        errors.push(`${payment.accountNumber || "unknown"}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      message: `Processed ${successCount} out of ${payments.length} payments successfully`,
      results,
      errors,
      summary: {
        total: payments.length,
        successful: successCount,
        failed: errors.length,
        totalAmount: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      },
    });
  } catch (error) {
    console.error("Bulk payment processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
