import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXeroDryRunPreview } from "@/lib/server/xero-invoice-mapper";
import { getXeroTokenScopes } from "@/lib/server/xero";
import { normalizeBillingMonth } from "@/lib/server/account-invoice-payments";

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
    const billingMonth = normalizeBillingMonth(body?.billingMonth);
    const limit = Math.min(Math.max(Number(body?.limit || 100), 1), 500);

    let query = supabase
      .from(sourceTable)
      .select("*")
      .order("account_number", { ascending: true })
      .limit(limit);

    query = billingMonth ? query.eq("billing_month", billingMonth) : query;

    if (Array.isArray(body?.accountNumbers) && body.accountNumbers.length > 0) {
      const accountNumbers = body.accountNumbers
        .map((value: unknown) => String(value || "").trim())
        .filter(Boolean);
      query = query.in("account_number", accountNumbers);
    }

    const { data: invoices, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch invoices for dry-run batch" },
        { status: 500 },
      );
    }

    const { scopes } = await getXeroTokenScopes();
    const hasAccountingScope =
      scopes.includes("accounting.transactions") ||
      scopes.includes("accounting.invoices");

    const rows = Array.isArray(invoices) ? invoices : [];
    const previews = rows.map((invoice) =>
      buildXeroDryRunPreview(invoice, sourceTable),
    );

    const logRows = previews.map((preview) => ({
      source_table: preview.sourceTable,
      source_invoice_id: preview.sourceInvoiceId,
      account_number: preview.accountNumber,
      billing_month: preview.billingMonth,
      local_invoice_number: preview.localInvoiceNumber || null,
      action: "dry_run",
      status: hasAccountingScope ? "ready_for_send" : "blocked_missing_scope",
      dry_run: true,
      payload: preview.xeroPayload,
      response: {
        scopes,
        batch: true,
      },
      created_by: user.id,
    }));

    const { data: syncLogs, error: logError } = await supabase
      .from("xero_invoice_sync_logs")
      .insert(logRows)
      .select("id, source_table, source_invoice_id, account_number, billing_month, local_invoice_number, status, dry_run, created_at");

    if (logError) {
      return NextResponse.json(
        { error: logError.message || "Failed to save Xero batch dry-run logs" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      dryRun: true,
      count: previews.length,
      hasAccountingScope,
      scopes,
      syncLogs: syncLogs || [],
      previews,
    });
  } catch (error) {
    console.error("Xero bulk dry-run route failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build Xero bulk dry run" },
      { status: 500 },
    );
  }
}
