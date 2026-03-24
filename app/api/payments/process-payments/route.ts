import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  defaultDueDate,
  buildDraftPaymentsFromVehicles,
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

    let invoice = await resolveAccountInvoice(supabase, {
      accountInvoiceId: accountInvoiceId ? String(accountInvoiceId) : null,
      accountNumber: accountNumber ? String(accountNumber).trim() : null,
      billingMonth: normalizeBillingMonth(billingMonth),
    });

    if (!invoice && accountNumber) {
      const normalizedAccountNumber = String(accountNumber).trim().toUpperCase();
      const normalizedBillingMonth = normalizeBillingMonth(billingMonth) || (() => {
        const currentMonth = new Date();
        currentMonth.setDate(1);
        return currentMonth.toISOString().slice(0, 10);
      })();

      const [
        { data: vehiclesByNewAccount, error: vehiclesByNewAccountError },
        { data: vehiclesByAccount, error: vehiclesByAccountError },
        { data: costCenterRow, error: costCenterError },
      ] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, reg, company, new_account_number, account_number, total_rental, total_sub")
          .eq("new_account_number", normalizedAccountNumber),
        supabase
          .from("vehicles")
          .select("id, reg, company, new_account_number, account_number, total_rental, total_sub")
          .eq("account_number", normalizedAccountNumber),
        supabase
          .from("cost_centers")
          .select("company, legal_name, vat_number, physical_address_1, physical_address_2, physical_address_3, physical_area, physical_code")
          .eq("cost_code", normalizedAccountNumber)
          .maybeSingle(),
      ]);

      if (vehiclesByNewAccountError || vehiclesByAccountError || costCenterError) {
        const message =
          vehiclesByNewAccountError?.message ||
          vehiclesByAccountError?.message ||
          costCenterError?.message ||
          "Failed to prepare draft invoice";
        return NextResponse.json({ error: message }, { status: 500 });
      }

      const vehicleMap = new Map<string, Record<string, unknown>>();
      [...(vehiclesByNewAccount || []), ...(vehiclesByAccount || [])].forEach((vehicle) => {
        const key =
          String(vehicle?.id || "").trim() ||
          String(vehicle?.reg || "").trim().toUpperCase() ||
          JSON.stringify([
            String(vehicle?.new_account_number || "").trim().toUpperCase(),
            String(vehicle?.account_number || "").trim().toUpperCase(),
            vehicle?.company || "",
            vehicle?.total_rental || "",
            vehicle?.total_sub || "",
          ]);
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, vehicle);
        }
      });

      const draft = buildDraftPaymentsFromVehicles(Array.from(vehicleMap.values())).get(normalizedAccountNumber);

      if (draft && Number(draft.due_amount || 0) > 0) {
        const { data: allocatedInvoiceNumber, error: numberError } = await supabase.rpc(
          "allocate_document_number",
          {
            sequence_name: "invoice",
            prefix: "INV-",
          },
        );

        if (numberError || !allocatedInvoiceNumber) {
          return NextResponse.json(
            { error: numberError?.message || "Failed to allocate invoice number" },
            { status: 500 },
          );
        }

        const invoiceDate = new Date().toISOString();
        const companyName =
          costCenterRow?.legal_name ||
          costCenterRow?.company ||
          draft.company ||
          normalizedAccountNumber;
        const clientAddress = [
          costCenterRow?.physical_address_1,
          costCenterRow?.physical_address_2,
          costCenterRow?.physical_address_3,
          costCenterRow?.physical_area,
          costCenterRow?.physical_code,
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join("\n");

        const totalAmount = Number(draft.due_amount || 0);
        const subtotal = Number((totalAmount / 1.15).toFixed(2));
        const vatAmount = Number((totalAmount - subtotal).toFixed(2));

        const { data: insertedInvoice, error: insertError } = await supabase
          .from("account_invoices")
          .insert({
            account_number: normalizedAccountNumber,
            billing_month: normalizedBillingMonth,
            invoice_number: allocatedInvoiceNumber,
            company_name: companyName,
            client_address: clientAddress || null,
            customer_vat_number: costCenterRow?.vat_number || null,
            invoice_date: invoiceDate,
            due_date: defaultDueDate(invoiceDate),
            subtotal: subtotal,
            vat_amount: vatAmount,
            discount_amount: 0,
            total_amount: totalAmount,
            paid_amount: 0,
            balance_due: totalAmount,
            payment_status: "pending",
            line_items: [
              {
                item_code: "CURRENT-BILLING",
                description: "Current vehicle billing draft",
                amountExcludingVat: subtotal.toFixed(2),
                vat_amount: vatAmount.toFixed(2),
                total_including_vat: totalAmount.toFixed(2),
              },
            ],
            notes: "Auto-created during payment from current vehicle billing draft",
            created_by: user?.id || null,
          })
          .select("*")
          .single();

        if (insertError) {
          return NextResponse.json(
            { error: insertError.message || "Failed to create invoice snapshot for payment" },
            { status: 500 },
          );
        }

        await upsertPaymentsMirror(supabase, insertedInvoice);
        invoice = insertedInvoice;
      }
    }

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
