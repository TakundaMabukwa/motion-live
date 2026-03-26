import { createClient } from "@/lib/supabase/server";
import { normalizeBillingMonth } from "@/lib/server/account-invoice-payments";

type SourceTable = "account_invoices" | "bulk_account_invoices";

type StoredInvoice = {
  id: string;
  account_number: string;
  billing_month?: string | null;
  invoice_number?: string | null;
  company_name?: string | null;
  client_address?: string | null;
  customer_vat_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;
  line_items?: Array<Record<string, unknown>> | null;
  notes?: string | null;
};

type InvoiceResolverInput = {
  sourceTable: SourceTable;
  invoiceId?: string | null;
  accountNumber?: string | null;
  billingMonth?: string | null;
};

const toNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const asDateOnly = (value: unknown) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const raw = String(value).trim();
  if (!raw) return new Date().toISOString().slice(0, 10);
  return raw.slice(0, 10);
};

const cleanText = (value: unknown) => String(value || "").trim();

const buildContactName = (invoice: StoredInvoice) =>
  cleanText(invoice.company_name) || cleanText(invoice.account_number) || "Unknown Customer";

const buildLineDescription = (item: Record<string, unknown>) => {
  const primary = cleanText(item.description);
  const code = cleanText(item.item_code);
  const reg = cleanText(item.regFleetDisplay || item.reg || item.fleetNumber);

  return [code, primary, reg].filter(Boolean).join(" | ").slice(0, 4000);
};

const mapLineItem = (item: Record<string, unknown>) => {
  const quantity = Math.max(1, toNumber(item.units ?? item.quantity ?? 1));
  const lineAmount = toNumber(
    item.amountExcludingVat ??
      item.total_excl_vat ??
      item.unit_price_without_vat ??
      item.unit_price ??
      0,
  );
  const unitAmount = quantity > 0 ? Number((lineAmount / quantity).toFixed(2)) : lineAmount;
  const taxAmount = toNumber(item.vat_amount ?? item.vatAmount ?? 0);
  const itemCode = cleanText(item.item_code) || cleanText(item.name) || "SERVICE";

  return {
    Description: buildLineDescription(item),
    Quantity: quantity,
    UnitAmount: unitAmount,
    LineAmount: Number(lineAmount.toFixed(2)),
    TaxAmount: Number(taxAmount.toFixed(2)),
    ItemCode: itemCode.slice(0, 30),
    Tracking: [],
  };
};

export const resolveStoredInvoiceForXero = async ({
  sourceTable,
  invoiceId,
  accountNumber,
  billingMonth,
}: InvoiceResolverInput) => {
  const supabase = await createClient();

  let query = supabase
    .from(sourceTable)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (invoiceId) {
    query = query.eq("id", invoiceId);
  } else {
    const resolvedAccountNumber = cleanText(accountNumber);
    if (!resolvedAccountNumber) {
      throw new Error("invoiceId or accountNumber is required");
    }
    query = query.eq("account_number", resolvedAccountNumber);

    const normalizedMonth = normalizeBillingMonth(billingMonth);
    query = normalizedMonth
      ? query.eq("billing_month", normalizedMonth)
      : query;
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to fetch stored invoice");
  }

  const invoice = (Array.isArray(data) ? data[0] : data) as StoredInvoice | null;
  if (!invoice) {
    throw new Error("Stored invoice not found");
  }

  return invoice;
};

export const buildXeroInvoicePayloadFromStoredInvoice = (invoice: StoredInvoice) => {
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const mappedLineItems = lineItems.map((item) => mapLineItem(item));
  const subtotal = Number(toNumber(invoice.subtotal).toFixed(2));
  const vatAmount = Number(toNumber(invoice.vat_amount).toFixed(2));
  const totalAmount = Number(toNumber(invoice.total_amount).toFixed(2));

  return {
    Type: "ACCREC",
    Contact: {
      Name: buildContactName(invoice),
    },
    Date: asDateOnly(invoice.invoice_date),
    DueDate: asDateOnly(invoice.due_date || invoice.invoice_date),
    InvoiceNumber: cleanText(invoice.invoice_number),
    Reference: cleanText(invoice.account_number),
    LineAmountTypes: "Exclusive",
    Status: "DRAFT",
    BrandingThemeID: null,
    CurrencyCode: "ZAR",
    LineItems: mappedLineItems,
    SubTotal: subtotal,
    TotalTax: vatAmount,
    Total: totalAmount,
  };
};

export const buildXeroDryRunPreview = (invoice: StoredInvoice, sourceTable: SourceTable) => {
  const payload = buildXeroInvoicePayloadFromStoredInvoice(invoice);

  return {
    sourceTable,
    sourceInvoiceId: invoice.id,
    accountNumber: invoice.account_number,
    billingMonth: normalizeBillingMonth(invoice.billing_month),
    localInvoiceNumber: cleanText(invoice.invoice_number),
    companyName: cleanText(invoice.company_name),
    totals: {
      subtotal: Number(toNumber(invoice.subtotal).toFixed(2)),
      vatAmount: Number(toNumber(invoice.vat_amount).toFixed(2)),
      totalAmount: Number(toNumber(invoice.total_amount).toFixed(2)),
    },
    xeroPayload: payload,
  };
};
