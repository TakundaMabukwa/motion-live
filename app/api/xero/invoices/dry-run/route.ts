import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildXeroDryRunPreview,
  resolveStoredInvoiceForXero,
} from "@/lib/server/xero-invoice-mapper";
import { getXeroTokenScopes } from "@/lib/server/xero";

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

    const logPayload = {
      source_table: sourceTable,
      source_invoice_id: invoice.id,
      account_number: invoice.account_number,
      billing_month: invoice.billing_month || null,
      local_invoice_number: invoice.invoice_number || null,
      action: "dry_run",
      status: hasAccountingScope ? "ready_for_send" : "blocked_missing_scope",
      dry_run: true,
      payload: preview.xeroPayload,
      response: {
        note: hasAccountingScope
          ? "Dry run created successfully. Xero send can be attempted when approved."
          : "Dry run created, but the Xero token does not yet have invoice/accounting scope.",
        scopes,
      },
      created_by: user.id,
    };

    const { data: syncLog, error: logError } = await supabase
      .from("xero_invoice_sync_logs")
      .insert(logPayload)
      .select("*")
      .single();

    if (logError) {
      console.error("Failed to insert Xero dry-run log:", logError);
      return NextResponse.json(
        { error: logError.message || "Failed to save dry-run log" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      dryRun: true,
      hasAccountingScope,
      scopes,
      syncLog,
      preview,
    });
  } catch (error) {
    console.error("Xero dry-run route failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build Xero dry run" },
      { status: 500 },
    );
  }
}
