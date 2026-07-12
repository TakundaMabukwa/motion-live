import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const toErrorMessage = (err: unknown): string => {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") return JSON.stringify(err);
  return "Unknown error";
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

    const accountNumber = String(body?.accountNumber || "").trim();
    if (!accountNumber) {
      return NextResponse.json({ error: "accountNumber is required" }, { status: 400 });
    }

    const billingMonth = String(body?.billingMonth || "").trim() || null;
    const companyName = String(body?.companyName || body?.accountName || "").trim() || null;
    const companyRegistrationNumber = String(body?.companyRegistrationNumber || "").trim() || null;
    const clientAddress = String(body?.clientAddress || "").trim() || null;
    const customerVatNumber = String(body?.customerVatNumber || "").trim() || null;
    const notes = String(body?.notes || "").trim() || null;

    const subtotal = Number(body?.subtotal ?? 0);
    const vatAmount = Number(body?.vatAmount ?? 0);
    const discountAmount = Number(body?.discountAmount ?? 0);
    const totalAmount = Number(body?.totalAmount ?? body?.total ?? 0);

    const lineItems = Array.isArray(body?.lineItems) ? body.lineItems : [];

    const { data, error } = await supabase.rpc("create_atomic_account_invoice", {
      p_user_id: user.id,
      p_account_number: accountNumber,
      p_billing_month: billingMonth,
      p_company_name: companyName,
      p_company_registration_number: companyRegistrationNumber,
      p_client_address: clientAddress,
      p_customer_vat_number: customerVatNumber,
      p_invoice_date: new Date().toISOString(),
      p_subtotal: subtotal,
      p_vat_amount: vatAmount,
      p_discount_amount: discountAmount,
      p_total_amount: totalAmount,
      p_line_items: lineItems,
      p_notes: notes,
      p_invoice_prefix: "INV",
    });

    if (error) {
      console.error("RPC create_atomic_account_invoice error:", error);
      return NextResponse.json(
        { error: toErrorMessage(error) },
        { status: 500 },
      );
    }

    const result = typeof data === "string" ? JSON.parse(data) : data;

    if (!result?.invoice) {
      return NextResponse.json({ error: "No invoice returned from RPC" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invoice: result.invoice,
      reused: result.reused ?? false,
    });
  } catch (error) {
    console.error("Error in re-invoice POST:", error);
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 500 },
    );
  }
}
