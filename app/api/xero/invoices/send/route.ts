import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildXeroDryRunPreview,
  resolveStoredInvoiceForXero,
} from "@/lib/server/xero-invoice-mapper";
import { callXeroApi, getXeroTokenScopes } from "@/lib/server/xero";

type SourceTable = "account_invoices" | "bulk_account_invoices";

const parseSourceTable = (value: unknown): SourceTable => {
  const normalized = String(value || "").trim();
  if (normalized === "account_invoices" || normalized === "bulk_account_invoices") {
    return normalized;
  }
  throw new Error("sourceTable must be account_invoices or bulk_account_invoices");
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
    if (body?.confirmLive !== true) {
      return NextResponse.json(
        { error: "Live Xero send is blocked unless confirmLive is true" },
        { status: 400 },
      );
    }

    const sourceTable = parseSourceTable(body?.sourceTable);
    const invoice = await resolveStoredInvoiceForXero({
      sourceTable,
      invoiceId: body?.invoiceId,
      accountNumber: body?.accountNumber,
      billingMonth: body?.billingMonth,
    });

    const preview = buildXeroDryRunPreview(invoice, sourceTable);
    const { scopes } = await getXeroTokenScopes();
    const hasAccountingScope =
      scopes.includes("accounting.transactions") ||
      scopes.includes("accounting.invoices");

    if (!hasAccountingScope) {
      return NextResponse.json(
        {
          error: "Xero app is missing invoice/accounting scope",
          scopes,
        },
        { status: 400 },
      );
    }

    const xeroResponse = await callXeroApi<{
      Invoices?: Array<Record<string, unknown>>;
    }>("/api.xro/2.0/Invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Invoices: [preview.xeroPayload],
      }),
    });

    const createdInvoice = Array.isArray(xeroResponse.body?.Invoices)
      ? xeroResponse.body?.Invoices?.[0] || null
      : null;

    const { data: syncLog, error: logError } = await supabase
      .from("xero_invoice_sync_logs")
      .insert({
        source_table: sourceTable,
        source_invoice_id: invoice.id,
        account_number: invoice.account_number,
        billing_month: invoice.billing_month || null,
        local_invoice_number: invoice.invoice_number || null,
        xero_invoice_id: createdInvoice?.InvoiceID ? String(createdInvoice.InvoiceID) : null,
        xero_invoice_number: createdInvoice?.InvoiceNumber
          ? String(createdInvoice.InvoiceNumber)
          : null,
        action: "send",
        status: xeroResponse.ok ? "sent" : "send_failed",
        dry_run: false,
        payload: preview.xeroPayload,
        response: xeroResponse.body,
        error_message: xeroResponse.ok ? null : `Xero send failed with status ${xeroResponse.status}`,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (logError) {
      console.error("Failed to insert Xero send log:", logError);
      return NextResponse.json(
        { error: logError.message || "Failed to save Xero send log" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: xeroResponse.ok,
        syncLog,
        xero: xeroResponse,
      },
      { status: xeroResponse.ok ? 200 : xeroResponse.status || 500 },
    );
  } catch (error) {
    console.error("Xero send route failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invoice to Xero" },
      { status: 500 },
    );
  }
}
