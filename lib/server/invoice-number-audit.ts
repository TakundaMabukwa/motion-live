import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const INVOICE_SEQUENCE_NAME = "invoice";
const DEFAULT_INVOICE_PREFIX = "INV";

type AllocateTrackedInvoiceNumberInput = {
  source: string;
  userId?: string | null;
  requestKey?: string | null;
  context?: Record<string, unknown> | null;
  prefix?: string;
};

type AllocateTrackedInvoiceNumberResult = {
  invoiceNumber: string;
  auditId: string | null;
};

type MarkTrackedInvoicePersistedInput = {
  auditId?: string | null;
  invoiceNumber: string;
  persistedTable: string;
  persistedInvoiceId?: string | null;
};

type MarkTrackedInvoiceFailedInput = {
  auditId?: string | null;
  invoiceNumber: string;
  errorMessage: string;
};

const formatErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || "Unknown error");
};

const safeLogAuditFailure = (action: string, error: unknown) => {
  console.warn(
    `[invoice-number-audit] ${action} failed: ${formatErrorMessage(error)}`,
  );
};

export const allocateTrackedInvoiceNumber = async (
  supabase: SupabaseClient,
  input: AllocateTrackedInvoiceNumberInput,
): Promise<AllocateTrackedInvoiceNumberResult> => {
  const prefix = String(input.prefix || DEFAULT_INVOICE_PREFIX).trim() || DEFAULT_INVOICE_PREFIX;

  const requestKey = String(input.requestKey || "").trim();
  if (requestKey) {
    try {
      const { data: existingEvent, error: existingEventError } = await supabase
        .from("invoice_number_events")
        .select("id, invoice_number, status")
        .eq("source", input.source)
        .eq("request_key", requestKey)
        .order("allocated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingEventError) {
        safeLogAuditFailure("lookup-request-key", existingEventError);
      } else if (existingEvent?.invoice_number) {
        if (String(existingEvent.status || "").trim().toLowerCase() === "failed") {
          try {
            await supabase
              .from("invoice_number_events")
              .update({
                status: "allocated",
                failed_at: null,
                error_message: null,
                allocated_at: new Date().toISOString(),
              })
              .eq("id", existingEvent.id);
          } catch (retryStatusError) {
            safeLogAuditFailure("restore-failed-allocation", retryStatusError);
          }
        }

        return {
          invoiceNumber: String(existingEvent.invoice_number),
          auditId: String(existingEvent.id || "").trim() || null,
        };
      }
    } catch (lookupError) {
      safeLogAuditFailure("lookup-request-key", lookupError);
    }
  }

  const { data, error } = await supabase.rpc("allocate_document_number", {
    sequence_name: INVOICE_SEQUENCE_NAME,
    prefix,
  });

  if (error || !data) {
    throw new Error(error?.message || "Failed to allocate invoice number");
  }

  const invoiceNumber = String(data || "").trim();
  if (!invoiceNumber) {
    throw new Error("Allocated invoice number was empty");
  }

  let auditId: string | null = null;

  try {
    const { data: auditRow, error: auditError } = await supabase
      .from("invoice_number_events")
      .insert({
        invoice_number: invoiceNumber,
        sequence_name: INVOICE_SEQUENCE_NAME,
        prefix,
        source: input.source,
        request_key: requestKey || null,
        allocated_by: input.userId || null,
        status: "allocated",
        context: input.context || {},
        allocated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (auditError) {
      safeLogAuditFailure("insert-allocation", auditError);
    } else {
      auditId = String(auditRow?.id || "").trim() || null;
    }
  } catch (auditError) {
    safeLogAuditFailure("insert-allocation", auditError);
  }

  return { invoiceNumber, auditId };
};

export const markTrackedInvoicePersisted = async (
  supabase: SupabaseClient,
  input: MarkTrackedInvoicePersistedInput,
) => {
  const normalizedInvoiceNumber = String(input.invoiceNumber || "").trim();
  if (!normalizedInvoiceNumber) return;

  try {
    const payload = {
        status: "persisted",
        persisted_table: input.persistedTable,
        persisted_invoice_id: input.persistedInvoiceId || null,
        persisted_at: new Date().toISOString(),
        error_message: null,
      };

    const { error } = input.auditId
      ? await supabase
          .from("invoice_number_events")
          .update(payload)
          .eq("id", input.auditId)
      : await supabase
          .from("invoice_number_events")
          .update(payload)
          .eq("invoice_number", normalizedInvoiceNumber)
          .eq("status", "allocated");

    if (error) {
      safeLogAuditFailure("mark-persisted", error);
    }
  } catch (auditError) {
    safeLogAuditFailure("mark-persisted", auditError);
  }
};

export const markTrackedInvoiceFailed = async (
  supabase: SupabaseClient,
  input: MarkTrackedInvoiceFailedInput,
) => {
  const normalizedInvoiceNumber = String(input.invoiceNumber || "").trim();
  if (!normalizedInvoiceNumber) return;

  try {
    const payload = {
      status: "failed",
      error_message: String(input.errorMessage || "Unknown error"),
      failed_at: new Date().toISOString(),
    };

    const { error } = input.auditId
      ? await supabase
          .from("invoice_number_events")
          .update(payload)
          .eq("id", input.auditId)
      : await supabase
          .from("invoice_number_events")
          .update(payload)
          .eq("invoice_number", normalizedInvoiceNumber)
          .eq("status", "allocated");

    if (error) {
      safeLogAuditFailure("mark-failed", error);
    }
  } catch (auditError) {
    safeLogAuditFailure("mark-failed", auditError);
  }
};

export type CreateAtomicInvoiceInput = {
  source: string;
  requestKey: string;
  userId: string;
  jobCardId: string;
  jobNumber?: string | null;
  quotationNumber?: string | null;
  accountNumber?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  subtotal?: number;
  vatAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  lineItems?: Record<string, unknown>[];
  prefix?: string;
};

export type CreateAtomicInvoiceResult = {
  invoice: Record<string, unknown>;
  reused: boolean;
};

export const createAtomicInvoice = async (
  supabase: SupabaseClient,
  input: CreateAtomicInvoiceInput,
): Promise<CreateAtomicInvoiceResult> => {
  const { data, error } = await supabase.rpc("create_atomic_invoice", {
    p_source: input.source,
    p_request_key: input.requestKey,
    p_user_id: input.userId,
    p_job_card_id: input.jobCardId,
    p_job_number: input.jobNumber || null,
    p_quotation_number: input.quotationNumber || null,
    p_account_number: input.accountNumber || null,
    p_client_name: input.clientName || null,
    p_client_email: input.clientEmail || null,
    p_client_phone: input.clientPhone || null,
    p_client_address: input.clientAddress || null,
    p_invoice_date: input.invoiceDate || new Date().toISOString(),
    p_due_date: input.dueDate || null,
    p_payment_terms: input.paymentTerms || null,
    p_notes: input.notes || null,
    p_subtotal: input.subtotal || 0,
    p_vat_amount: input.vatAmount || 0,
    p_discount_amount: input.discountAmount || 0,
    p_total_amount: input.totalAmount || 0,
    p_line_items: input.lineItems || [],
    p_invoice_prefix: input.prefix || "INV",
  });

  if (error) {
    throw new Error(error.message || "Failed to create atomic invoice");
  }

  const result = data as Record<string, unknown>;
  const invoice = (result?.invoice as Record<string, unknown>) || null;
  const reused = Boolean(result?.reused);

  if (!invoice) {
    throw new Error("Atomic invoice creation returned no invoice");
  }

  return { invoice, reused };
};
