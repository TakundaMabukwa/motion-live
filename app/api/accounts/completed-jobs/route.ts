import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMPLETED_JOBS_LOCK_KEY = "completed_jobs_invoicing";
const INVOICE_LOOKUP_CHUNK_SIZE = 200;

type InvoiceLookupRow = {
  id: string;
  job_card_id: string | null;
  job_number: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  created_at: string | null;
};

type CompletedJobRow = {
  [key: string]: unknown;
};

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const getInvoiceSortTimestamp = (invoice: InvoiceLookupRow) => {
  const rawDate = String(invoice.invoice_date || invoice.created_at || "").trim();
  if (!rawDate) return 0;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const mergeInvoiceIntoBillingStatuses = (
  billingStatuses: Record<string, unknown>,
  invoice: InvoiceLookupRow,
) => {
  const currentInvoiceStatus =
    billingStatuses.invoice && typeof billingStatuses.invoice === "object"
      ? (billingStatuses.invoice as Record<string, unknown>)
      : {};

  return {
    ...billingStatuses,
    invoice: {
      ...currentInvoiceStatus,
      done: true,
      at:
        currentInvoiceStatus.at ||
        invoice.invoice_date ||
        invoice.created_at ||
        new Date().toISOString(),
      invoice_id: currentInvoiceStatus.invoice_id || invoice.id,
      invoice_number:
        currentInvoiceStatus.invoice_number || invoice.invoice_number || null,
      invoice_date:
        currentInvoiceStatus.invoice_date || invoice.invoice_date || null,
      total_amount:
        currentInvoiceStatus.total_amount ??
        (typeof invoice.total_amount === "number" ? invoice.total_amount : null),
      reference:
        currentInvoiceStatus.reference || invoice.invoice_number || null,
    },
  };
};

const isInvoiceMarked = (billingStatuses: Record<string, unknown>) => {
  const invoiceStatus = billingStatuses.invoice;

  if (invoiceStatus === true) return true;
  if (invoiceStatus && typeof invoiceStatus === "object") {
    const invoiceObj = invoiceStatus as Record<string, unknown>;
    return Boolean(
      invoiceObj.done === true ||
        invoiceObj.invoice_id ||
        invoiceObj.invoice_number ||
        invoiceObj.reference,
    );
  }
  return false;
};

const getInvoiceNumberFromStatuses = (billingStatuses: Record<string, unknown>) => {
  const invoiceStatus = billingStatuses.invoice;
  if (!invoiceStatus || typeof invoiceStatus !== "object") return null;
  const invoiceObj = invoiceStatus as Record<string, unknown>;
  const invoiceNumber = String(
    invoiceObj.invoice_number || invoiceObj.reference || "",
  ).trim();
  return invoiceNumber || null;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const invoiceState = String(
      searchParams.get("invoiceState") || "all",
    ).toLowerCase();
    const search = String(searchParams.get("search") || "").trim();
    const searchField = String(searchParams.get("searchField") || "").trim().toLowerCase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: completedJobsLock } = await supabase
      .from("accounts_completed_jobs_locks")
      .select("is_locked, lock_date, locked_at")
      .eq("lock_key", COMPLETED_JOBS_LOCK_KEY)
      .maybeSingle();

    const lockDateRaw = String(completedJobsLock?.lock_date || "").trim();
    const lockTimestampRaw = String(completedJobsLock?.locked_at || "").trim();
    const isCompletedJobsLocked =
      Boolean(completedJobsLock?.is_locked) &&
      (Boolean(lockTimestampRaw) || /^\d{4}-\d{2}-\d{2}$/.test(lockDateRaw));

    let completedJobsCutoffExclusiveIso: string | null = null;
    if (isCompletedJobsLocked) {
      const lockedAt = new Date(lockTimestampRaw);
      if (!Number.isNaN(lockedAt.getTime())) {
        completedJobsCutoffExclusiveIso = lockedAt.toISOString();
      } else {
        const [year, month, day] = lockDateRaw.split("-").map((part) => Number(part));
        if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
          // Fallback: if locked_at is missing, use end-of-day lock_date (+02).
          const localLockMidnightUtc = new Date(
            Date.UTC(year, month - 1, day, 0 - 2, 0, 0),
          );
          if (!Number.isNaN(localLockMidnightUtc.getTime())) {
            const nextDayUtc = new Date(
              localLockMidnightUtc.getTime() + 24 * 60 * 60 * 1000,
            );
            completedJobsCutoffExclusiveIso = nextDayUtc.toISOString();
          }
        }
      }
    }

    // Fetch accounts-routed jobs and classify invoice state consistently.
    // Some legacy rows have status="completed" but job_status not set to Completed.
    const { data, error } = await supabase
      .from("job_cards")
      .select(
        `
        id,
        job_number,
        job_date,
        end_time,
        status,
        job_type,
        job_description,
        customer_name,
        customer_email,
        vehicle_registration,
        vehicle_make,
        vehicle_model,
        updated_at,
        job_status,
        quotation_products,
        quotation_total_amount,
        billing_statuses,
        completion_notes,
        completion_date,
        new_account_number,
        order_number,
        invoiced_by
      `,
      )
      .eq("role", "accounts")
      .order("completion_date", { ascending: false });

    if (error) {
      console.error("Error fetching accounts completed jobs:", error);
      return NextResponse.json(
        { error: "Failed to fetch completed jobs" },
        { status: 500 },
      );
    }

    const accountsJobRows = (data || []) as CompletedJobRow[];
    const baseJobRowsById = new Map<string, CompletedJobRow>();
    for (const row of accountsJobRows) {
      const rowId = String(row.id || "").trim();
      if (rowId) {
        baseJobRowsById.set(rowId, row);
      }
    }

    // Include invoice-linked jobs even when they were not moved to role="accounts"
    // yet. This keeps completed-jobs invoice visibility consistent for all job-card
    // invoices.
    const { data: invoiceLinkedIdsRows, error: invoiceLinkedIdsError } = await supabase
      .from("invoices")
      .select("job_card_id")
      .not("invoice_number", "is", null)
      .not("job_card_id", "is", null);

    if (invoiceLinkedIdsError) {
      console.error(
        "Error fetching invoice-linked job_card_id rows for completed jobs:",
        invoiceLinkedIdsError,
      );
    }

    const invoiceLinkedMissingIds = Array.from(
      new Set(
        (invoiceLinkedIdsRows || [])
          .map((row) => String(row.job_card_id || "").trim())
          .filter((value) => value.length > 0 && !baseJobRowsById.has(value)),
      ),
    );

    const invoiceLinkedExtraRows: CompletedJobRow[] = [];
    for (const idChunk of chunkArray(invoiceLinkedMissingIds, INVOICE_LOOKUP_CHUNK_SIZE)) {
      const { data: extraRows, error: extraRowsError } = await supabase
        .from("job_cards")
        .select(
          `
          id,
          job_number,
          job_date,
          end_time,
          status,
          job_type,
          job_description,
          customer_name,
          customer_email,
          vehicle_registration,
          vehicle_make,
          vehicle_model,
          updated_at,
          job_status,
          quotation_products,
          quotation_total_amount,
          billing_statuses,
          completion_notes,
          completion_date,
          new_account_number,
          order_number,
          invoiced_by
        `,
        )
        .in("id", idChunk);

      if (extraRowsError) {
        console.error(
          "Error fetching invoice-linked job cards for completed jobs:",
          extraRowsError,
        );
        continue;
      }

      if (Array.isArray(extraRows)) {
        invoiceLinkedExtraRows.push(...(extraRows as CompletedJobRow[]));
      }
    }

    const jobRows = [...accountsJobRows, ...invoiceLinkedExtraRows];
    const jobIds = Array.from(
      new Set(
        jobRows
          .map((job) => String(job.id || "").trim())
          .filter((value) => value.length > 0),
      ),
    );
    const jobNumbers = Array.from(
      new Set(
        jobRows
          .map((job) => String(job.job_number || "").trim())
          .filter((value) => value.length > 0),
      ),
    );

    const invoiceRows: InvoiceLookupRow[] = [];

    for (const idChunk of chunkArray(jobIds, INVOICE_LOOKUP_CHUNK_SIZE)) {
      const { data: batchRows, error: batchError } = await supabase
        .from("invoices")
        .select(
          "id, job_card_id, job_number, invoice_number, invoice_date, total_amount, created_at",
        )
        .in("job_card_id", idChunk);

      if (batchError) {
        console.error(
          "Error fetching completed jobs invoice lookup by job_card_id:",
          batchError,
        );
        continue;
      }

      if (Array.isArray(batchRows)) {
        invoiceRows.push(...(batchRows as InvoiceLookupRow[]));
      }
    }

    for (const numberChunk of chunkArray(jobNumbers, INVOICE_LOOKUP_CHUNK_SIZE)) {
      const { data: batchRows, error: batchError } = await supabase
        .from("invoices")
        .select(
          "id, job_card_id, job_number, invoice_number, invoice_date, total_amount, created_at",
        )
        .in("job_number", numberChunk);

      if (batchError) {
        console.error(
          "Error fetching completed jobs invoice lookup by job_number:",
          batchError,
        );
        continue;
      }

      if (Array.isArray(batchRows)) {
        invoiceRows.push(...(batchRows as InvoiceLookupRow[]));
      }
    }

    const invoiceByJobId = new Map<string, InvoiceLookupRow>();
    const invoiceByJobNumber = new Map<string, InvoiceLookupRow>();

    for (const invoice of invoiceRows) {
      const jobCardId = String(invoice.job_card_id || "").trim();
      if (jobCardId) {
        const existing = invoiceByJobId.get(jobCardId);
        if (
          !existing ||
          getInvoiceSortTimestamp(invoice) > getInvoiceSortTimestamp(existing)
        ) {
          invoiceByJobId.set(jobCardId, invoice);
        }
      }

      const jobNumber = String(invoice.job_number || "").trim();
      if (jobNumber) {
        const existing = invoiceByJobNumber.get(jobNumber);
        if (
          !existing ||
          getInvoiceSortTimestamp(invoice) > getInvoiceSortTimestamp(existing)
        ) {
          invoiceByJobNumber.set(jobNumber, invoice);
        }
      }
    }

    const normalizedJobs = jobRows.map((job: CompletedJobRow) => {
      const invoiceFromInvoicesTable =
        invoiceByJobId.get(String(job.id || "").trim()) ||
        invoiceByJobNumber.get(String(job.job_number || "").trim()) ||
        null;
      const currentBillingStatuses =
        typeof job?.billing_statuses === "object" && job?.billing_statuses !== null
          ? (job.billing_statuses as Record<string, unknown>)
          : {};
      const mergedBillingStatuses = invoiceFromInvoicesTable
        ? mergeInvoiceIntoBillingStatuses(
            currentBillingStatuses,
            invoiceFromInvoicesTable,
          )
        : currentBillingStatuses;
      const normalizedJobStatus = String(job.job_status || "")
        .trim()
        .toLowerCase();
      const normalizedStatus = String(job.status || "").trim().toLowerCase();
      const hasInvoiceEvidence =
        Boolean(invoiceFromInvoicesTable?.invoice_number) ||
        isInvoiceMarked(mergedBillingStatuses);
      const isCompletedFamily =
        normalizedJobStatus === "completed" ||
        normalizedJobStatus === "invoiced" ||
        normalizedStatus === "completed" ||
        hasInvoiceEvidence;
      const isInvoiced =
        normalizedJobStatus === "invoiced" ||
        isInvoiceMarked(mergedBillingStatuses) ||
        Boolean(invoiceFromInvoicesTable?.invoice_number);

      return {
        job: {
          ...job,
          billing_statuses: mergedBillingStatuses,
          invoice: invoiceFromInvoicesTable,
        },
        invoiceFromInvoicesTable,
        normalizedJobStatus,
        isCompletedFamily,
        isInvoiced,
      };
    });

    const completedUniverse = normalizedJobs.filter((row) => {
      // Explicit rule from Accounts: if a job is invoiced, always show it.
      if (row.isInvoiced) return true;

      if (!row.isCompletedFamily) return false;
      if (!completedJobsCutoffExclusiveIso) return true;

      const referenceDateRaw = String(
        row.job.completion_date ||
          row.job.end_time ||
          row.invoiceFromInvoicesTable?.invoice_date ||
          row.job.updated_at ||
          row.job.job_date ||
          "",
      ).trim();

      if (!referenceDateRaw) return false;
      const referenceDate = new Date(referenceDateRaw);
      if (Number.isNaN(referenceDate.getTime())) return false;

      return referenceDate.toISOString() < completedJobsCutoffExclusiveIso;
    });

    const tabFilteredRows = completedUniverse.filter((row) => {
      if (invoiceState === "invoiced") return row.isInvoiced;
      if (invoiceState === "not_invoiced") return !row.isInvoiced;
      return true;
    });

    const escapedSearch = search.replace(/[%_,]/g, "").toLowerCase();
    const searchFilteredRows = tabFilteredRows.filter((row) => {
      if (!escapedSearch) return true;

      const jobNumber = String(row.job.job_number || "").toLowerCase();
      if (searchField === "job_number") {
        return jobNumber.includes(escapedSearch);
      }

      return [
        row.job.job_number,
        row.job.customer_name,
        row.job.customer_email,
      ].some((value) =>
        String(value || "").toLowerCase().includes(escapedSearch),
      );
    });

    const counts = completedUniverse.reduce(
      (acc, row) => {
        if (row.isInvoiced) {
          acc.invoiced += 1;
        } else {
          acc.notInvoiced += 1;
        }
        return acc;
      },
      { invoiced: 0, notInvoiced: 0 },
    );

    const filteredJobs = searchFilteredRows.map((row) => row.job);

    const invoicedByIds = Array.from(
      new Set(
        filteredJobs
          .map((job) => job.invoiced_by)
          .filter((value) => typeof value === "string" && value.length > 0),
      ),
    );

    const { data: users, error: usersError } =
      invoicedByIds.length > 0
        ? await supabase.from("users").select("id, email").in("id", invoicedByIds)
        : { data: [], error: null };

    if (usersError) {
      console.error("Error fetching invoiced_by users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch invoice user details" },
        { status: 500 },
      );
    }

    const userEmailById = new Map((users || []).map((row) => [row.id, row.email]));

    // Transform the data to match the expected format
    const transformedJobs = filteredJobs.map((job) => {
      const effectiveInvoicedBy = job.invoiced_by || null;

      return {
        id: job.id,
        job_number: job.job_number,
        job_date: job.job_date,
        start_time: job.start_time,
        end_time: job.end_time,
        status: job.status,
        job_type: job.job_type,
        job_description: job.job_description,
        priority: job.priority,
        customer_name: job.customer_name,
        customer_email: job.customer_email,
        customer_phone: job.customer_phone,
        customer_address: job.customer_address,
        vehicle_registration: job.vehicle_registration,
        vehicle_make: job.vehicle_make,
        vehicle_model: job.vehicle_model,
        vehicle_year: job.vehicle_year,
        technician_name: job.technician_name,
        technician_phone: job.technician_phone,
        estimated_duration_hours: job.estimated_duration_hours,
        actual_duration_hours: job.actual_duration_hours,
        created_at: job.created_at,
        updated_at: job.updated_at,
        repair: job.repair,
        role: job.role,
        job_status: job.job_status,
        job_location: job.job_location,
        estimated_cost: job.estimated_cost,
        actual_cost: job.actual_cost,
        quotation_number: job.quotation_number,
        quote_date: job.quote_date,
        quote_expiry_date: job.quote_expiry_date,
        quote_status: job.quote_status,
        purchase_type: job.purchase_type,
        quotation_job_type: job.quotation_job_type,
        quote_type: job.quote_type,
        quotation_products: job.quotation_products,
        parts_required: job.parts_required,
        equipment_used: job.equipment_used,
        quotation_subtotal: job.quotation_subtotal,
        quotation_vat_amount: job.quotation_vat_amount,
        quotation_total_amount: job.quotation_total_amount,
        billing_statuses: job.billing_statuses,
        before_photos: job.before_photos,
        after_photos: job.after_photos,
        work_notes: job.work_notes,
        completion_notes: job.completion_notes,
        completion_date: job.completion_date,
        special_instructions: job.special_instructions,
        site_contact_person: job.site_contact_person,
        site_contact_phone: job.site_contact_phone,
        vin_numer: job.vin_numer,
        odormeter: job.odormeter,
        ip_address: job.ip_address,
        new_account_number: job.new_account_number,
        contact_person: job.contact_person,
        annuity_end_date: job.annuity_end_date,
        order_number: job.order_number,
        invoice: job.invoice || null,
        invoice_number:
          (job.invoice && typeof job.invoice === "object"
            ? String(job.invoice.invoice_number || "").trim()
            : "") || getInvoiceNumberFromStatuses(job.billing_statuses || {}) || null,
        invoice_id:
          job.invoice && typeof job.invoice === "object"
            ? job.invoice.id || null
            : null,
        invoice_date:
          job.invoice && typeof job.invoice === "object"
            ? job.invoice.invoice_date || null
            : null,
        invoice_total_amount:
          job.invoice && typeof job.invoice === "object"
            ? job.invoice.total_amount ?? null
            : null,
        invoiced_by: effectiveInvoicedBy,
        invoiced_by_email: effectiveInvoicedBy
          ? userEmailById.get(effectiveInvoicedBy) || null
          : null,
      };
    });

    return NextResponse.json({
      jobs: transformedJobs,
      total: transformedJobs.length,
      counts,
      completedJobsLock: {
        is_locked: Boolean(completedJobsLock?.is_locked),
        lock_date: lockDateRaw || null,
        locked_at: lockTimestampRaw || null,
        cutoff_exclusive: completedJobsCutoffExclusiveIso,
      },
    });
  } catch (error) {
    console.error("Error in accounts completed jobs GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
