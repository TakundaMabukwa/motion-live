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
