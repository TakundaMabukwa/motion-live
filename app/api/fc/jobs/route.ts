import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface JobRecord {
  id: string;
  job_number: string | null;
  order_number: string | null;
  job_date: string | null;
  due_date: string | null;
  completion_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  job_status: string | null;
  job_type: string | null;
  job_sub_type: string | null;
  job_description: string | null;
  priority: string | null;
  role: string | null;
  move_to: string | null;
  move_to_role: string | null;
  escalation_role: string | null;
  escalation_source_role: string | null;
  repair: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  contact_person: string | null;
  new_account_number: string | null;
  vehicle_registration: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  vin_numer: string | null;
  odormeter: string | null;
  ip_address: string | null;
  qr_code: string | null;
  technician_name: string | null;
  technician_phone: string | null;
  assigned_technician_id: string | null;
  job_location: string | null;
  site_contact_person: string | null;
  site_contact_phone: string | null;
  latitude: string | null;
  longitude: string | null;
  estimated_duration_hours: string | null;
  actual_duration_hours: string | null;
  estimated_cost: string | null;
  actual_cost: string | null;
  quotation_number: string | null;
  quote_status: string | null;
  quote_type: string | null;
  quotation_job_type: string | null;
  purchase_type: string | null;
  quote_date: string | null;
  quote_expiry_date: string | null;
  quotation_subtotal: string | null;
  quotation_vat_amount: string | null;
  quotation_total_amount: string | null;
  quotation_products: unknown;
  parts_required: unknown;
  products_required: unknown;
  equipment_used: unknown;
  safety_checklist_completed: unknown;
  quality_check_passed: unknown;
  customer_signature_obtained: unknown;
  before_photos: unknown;
  after_photos: unknown;
  documents: unknown;
  special_instructions: string | null;
  access_requirements: string | null;
  work_notes: string | null;
  completion_notes: string | null;
  customer_feedback: string | null;
  customer_satisfaction_rating: string | null;
  created_by: string | null;
  billing_statuses: unknown;
  fc_note_acknowledged: unknown;
  ready_for_invoicing: boolean | null;
}

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
    const search = String(searchParams.get("search") || "").trim();
    const showAllJobs = searchParams.get("allJobs") === "true";
    const roleFilter = String(searchParams.get("role") || "").trim().toLowerCase();

    const { data: userData } = await supabase
      .from("users")
      .select("role, secondary_role")
      .eq("id", user.id)
      .single();

    const isFc = userData?.role === "fc" || userData?.secondary_role === "fc";

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let fcCostCodes: string[] = [];

    if (isFc) {
      const { data: fcCostCenters } = await serviceSupabase
        .from("cost_centers")
        .select("cost_code")
        .eq("fc_id", user.id)
        .not("cost_code", "is", null);

      fcCostCodes = [...new Set(
        (fcCostCenters || [])
          .map((cc: any) => String(cc.cost_code || "").trim())
          .filter(Boolean)
      )];
    }

    let query = serviceSupabase
      .from("job_cards")
      .select("*")
      .order("created_at", { ascending: false });

    if (!showAllJobs && isFc && fcCostCodes.length > 0) {
      query = query.in("new_account_number", fcCostCodes.map((c) => c.replace(/[^-.\w]/g, "")));
    }

    // Fetch in batches — Supabase PostgREST caps at 1000 rows per request
    const BATCH = 1000;
    let from = 0;
    let allRows: JobRecord[] = [];
    while (true) {
      const { data: batch, error } = await query.range(from, from + BATCH - 1);
      if (error) {
        console.error("Error fetching FC jobs:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
      }
      const rows = (batch || []) as unknown as JobRecord[];
      allRows = allRows.concat(rows);
      if (rows.length < BATCH) break;
      from += BATCH;
    }

    const jobs = allRows;

    // Fetch invoiced job_numbers from the invoices table
    const invoicedJobNumbers = new Set<string>();
    const { data: invoiceRows, error: invoiceError } = await serviceSupabase
      .from("invoices")
      .select("job_number");
    if (invoiceError) {
      console.error("Error fetching invoices for filtering:", invoiceError);
    }
    if (Array.isArray(invoiceRows)) {
      for (const row of invoiceRows) {
        if (row.job_number) invoicedJobNumbers.add(String(row.job_number).trim().toLowerCase());
      }
    }
    console.log(`[FC Jobs] Found ${invoicedJobNumbers.size} invoiced job numbers to exclude`);

    const normalizeToken = (value: unknown) =>
      String(value || "").trim().toLowerCase();

    const allJobs = jobs.filter((job) => {
      // Exclude jobs that have a matching job_number in the invoices table
      const jobNum = normalizeToken(job.job_number);
      if (jobNum && invoicedJobNumbers.has(jobNum)) {
        console.log(`[FC Jobs] EXCLUDED ${job.job_number} — found in invoices table`);
        return false;
      }

      // Exclude jobs with status "invoiced"
      const s = normalizeToken(job.status);
      const js = normalizeToken(job.job_status);
      if (s === "invoiced" || js === "invoiced") return false;

      // Filter by role if requested (e.g. role=fc for Not Ready For Invoicing)
      if (roleFilter) {
        const jobRole = normalizeToken(job.role);
        if (jobRole !== roleFilter) return false;
      }

      return true;
    });

    console.log(`[FC Jobs] After filtering: ${allJobs.length} jobs returned (excluded ${jobs.length - allJobs.length} total)`);

    // Apply search filter
    const searchResults = search
      ? allJobs.filter((job) => {
          const q = search.toLowerCase();
          return [
            job.job_number,
            job.customer_name,
            job.customer_email,
            job.vehicle_registration,
            job.job_description,
            job.order_number,
            job.new_account_number,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);
        })
      : allJobs;

    // Compute stats
    const completed = searchResults.filter((job) => {
      const s = normalizeToken(job.status);
      const js = normalizeToken(job.job_status);
      return s === "completed" || js === "completed";
    }).length;

    const inProgress = searchResults.filter((job) => {
      const s = normalizeToken(job.status);
      const js = normalizeToken(job.job_status);
      return s === "in progress" || js === "in progress" || s === "processing" || js === "processing";
    }).length;

    const pending = searchResults.filter((job) => {
      const s = normalizeToken(job.status);
      const js = normalizeToken(job.job_status);
      return !s || s === "pending" || s === "new" || (!js || js === "pending" || js === "new");
    }).length;

    return NextResponse.json({
      jobs: searchResults,
      total: searchResults.length,
      stats: {
        total: searchResults.length,
        completed,
        inProgress,
        pending,
        unassigned: searchResults.filter((j) => !j.assigned_technician_id).length,
      },
    });
  } catch (error) {
    console.error("Error in FC jobs GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
