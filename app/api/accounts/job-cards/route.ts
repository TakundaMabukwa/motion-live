import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const parseQuotationProducts = (value: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const getJobValue = (job: {
  quotation_products?: unknown;
  quotation_total_amount?: number | string | null;
  estimated_cost?: number | string | null;
}) => {
  const productTotal = parseQuotationProducts(job.quotation_products).reduce(
    (sum, product) => {
      const totalPrice = Number(product?.total_price || 0);
      return Number.isFinite(totalPrice) && totalPrice > 0 ? sum + totalPrice : sum;
    },
    0,
  );

  if (productTotal > 0) {
    return productTotal;
  }

  for (const candidate of [
    job.quotation_total_amount,
    job.estimated_cost,
  ]) {
    const numeric = Number(candidate || 0);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return 0;
};

const isClosedJob = (job: { job_status?: unknown; status?: unknown }) => {
  const jobStatus = String(job.job_status || "").trim().toLowerCase();
  const status = String(job.status || "").trim().toLowerCase();

  return (
    jobStatus === "completed" ||
    jobStatus === "invoiced" ||
    jobStatus === "closed" ||
    status === "completed" ||
    status === "invoiced" ||
    status === "closed"
  );
};

const isOpenJob = (job: { job_status?: unknown; status?: unknown }) => !isClosedJob(job);

const getBillingMonthRange = (billingMonth: string) => {
  const start = new Date(`${billingMonth}T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
};

const isInBillingMonth = (value: unknown, billingMonth: string) => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return false;
  const { start, end } = getBillingMonthRange(billingMonth);
  return parsed >= start && parsed < end;
};

const sortJobs = (left: Record<string, unknown>, right: Record<string, unknown>) => {
  const leftDate = new Date(
    String(
      left?.completion_date ||
        left?.end_time ||
        left?.job_date ||
        left?.updated_at ||
        left?.created_at ||
        0,
    ),
  ).getTime();
  const rightDate = new Date(
    String(
      right?.completion_date ||
        right?.end_time ||
        right?.job_date ||
        right?.updated_at ||
        right?.created_at ||
        0,
    ),
  ).getTime();

  return rightDate - leftDate;
};

type AccountJobRow = {
  id: string | null;
  job_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  vehicle_registration: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  role: string | null;
  status: string | null;
  job_status: string | null;
  job_type: string | null;
  job_description: string | null;
  technician_name: string | null;
  new_account_number: string;
  job_date: string | null;
  completion_date: string | null;
  end_time: string | null;
  created_at: string | null;
  updated_at: string | null;
  state: "open" | "closed";
  job_value: number;
  invoice: {
    id: string | null;
    job_card_id: string | null;
    job_number: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    total_amount: number;
    due_date: string | null;
    client_name: string | null;
    line_items: unknown[];
  } | null;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = String(searchParams.get("accountNumber") || "").trim();
    const billingMonth = String(searchParams.get("billingMonth") || "").trim();
    const state = String(searchParams.get("state") || "all").trim().toLowerCase();

    if (!accountNumber) {
      return NextResponse.json({ error: "accountNumber is required" }, { status: 400 });
    }

    const { data: jobs, error: jobsError } = await supabase
      .from("job_cards")
      .select(
        `
        id,
        job_number,
        customer_name,
        customer_email,
        vehicle_registration,
        vehicle_make,
        vehicle_model,
        role,
        status,
        job_status,
        job_type,
        job_description,
        technician_name,
        new_account_number,
        quotation_products,
        quotation_total_amount,
        estimated_cost,
        job_date,
        completion_date,
        end_time,
        created_at,
        updated_at
      `,
      )
      .eq("new_account_number", accountNumber)
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error("Error fetching account job cards:", jobsError);
      return NextResponse.json({ error: jobsError.message || "Failed to fetch job cards" }, { status: 500 });
    }

    const jobIds = Array.from(
      new Set(
        (jobs || [])
          .map((job) => String(job?.id || "").trim())
          .filter(Boolean),
      ),
    );

    let invoicesByJobId = new Map<string, Record<string, unknown>>();
    if (jobIds.length > 0) {
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select(
          `
          id,
          job_card_id,
          job_number,
          invoice_number,
          invoice_date,
          total_amount,
          due_date,
          client_name,
          line_items,
          created_at
        `,
        )
        .in("job_card_id", jobIds);

      if (invoicesError) {
        console.error("Error fetching account job-card invoices:", invoicesError);
        return NextResponse.json({ error: invoicesError.message || "Failed to fetch invoices" }, { status: 500 });
      }

      invoicesByJobId = new Map(
        (Array.isArray(invoices) ? invoices : []).map((invoice) => [
          String(invoice?.job_card_id || "").trim(),
          invoice,
        ]),
      );
    }

    const normalizedRows = (jobs || [])
      .map((job) => {
        const closed = isClosedJob(job);
        const billingAnchor = closed
          ? job.completion_date || job.end_time || job.updated_at || job.job_date || job.created_at
          : job.job_date || job.created_at || job.updated_at;

        if (billingMonth && !isInBillingMonth(billingAnchor, billingMonth)) {
          return null;
        }

        const invoice = invoicesByJobId.get(String(job.id || "").trim()) || null;
        const jobValue = getJobValue(job);

        return {
          id: job.id,
          job_number: job.job_number || null,
          customer_name: job.customer_name || null,
          customer_email: job.customer_email || null,
          vehicle_registration: job.vehicle_registration || null,
          vehicle_make: job.vehicle_make || null,
          vehicle_model: job.vehicle_model || null,
          role: job.role || null,
          status: job.status || null,
          job_status: job.job_status || null,
          job_type: job.job_type || null,
          job_description: job.job_description || null,
          technician_name: job.technician_name || null,
          new_account_number: job.new_account_number || accountNumber,
          job_date: job.job_date || null,
          completion_date: job.completion_date || null,
          end_time: job.end_time || null,
          created_at: job.created_at || null,
          updated_at: job.updated_at || null,
          state: closed ? "closed" : "open",
          job_value: Number(jobValue.toFixed(2)),
          invoice: invoice
            ? {
                id: invoice.id,
                job_card_id: invoice.job_card_id,
                job_number: invoice.job_number,
                invoice_number: invoice.invoice_number,
                invoice_date: invoice.invoice_date,
                total_amount: Number(invoice.total_amount || 0),
                due_date: invoice.due_date || null,
                client_name: invoice.client_name || null,
                line_items: Array.isArray(invoice.line_items) ? invoice.line_items : [],
              }
            : null,
        };
      })
      .filter((job): job is AccountJobRow => Boolean(job))
      .sort(sortJobs);

    const filteredRows =
      state === "open"
        ? normalizedRows.filter((job) => isOpenJob(job))
        : state === "closed"
          ? normalizedRows.filter((job) => isClosedJob(job))
          : normalizedRows;

    const summary = normalizedRows.reduce(
      (acc, job) => {
        if (job.state === "open") {
          acc.openCount += 1;
          acc.openValue += Number(job.job_value || 0);
        } else {
          acc.closedCount += 1;
          acc.closedValue += Number(job.job_value || 0);
        }

        if (job.invoice) {
          acc.invoiceCount += 1;
          acc.invoiceValue += Number(job.invoice.total_amount || 0);
        }

        return acc;
      },
      {
        openCount: 0,
        openValue: 0,
        closedCount: 0,
        closedValue: 0,
        invoiceCount: 0,
        invoiceValue: 0,
      },
    );

    return NextResponse.json({
      accountNumber,
      billingMonth: billingMonth || null,
      state,
      jobs: filteredRows,
      summary: {
        openCount: summary.openCount,
        openValue: Number(summary.openValue.toFixed(2)),
        closedCount: summary.closedCount,
        closedValue: Number(summary.closedValue.toFixed(2)),
        invoiceCount: summary.invoiceCount,
        invoiceValue: Number(summary.invoiceValue.toFixed(2)),
      },
      total: filteredRows.length,
    });
  } catch (error) {
    console.error("Error in accounts job cards GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
