import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isFc = userData?.role === "fc";

    let fcCostCodes: string[] = [];

    if (isFc) {
      const { data: fcCostCenters } = await supabase
        .from("cost_centers")
        .select("cost_code")
        .eq("fc_id", user.id)
        .not("cost_code", "is", null);

      fcCostCodes = [...new Set(
        (fcCostCenters || [])
          .map((cc: any) => String(cc.cost_code || "").trim())
          .filter(Boolean)
      )];

      if (fcCostCodes.length === 0) {
        return NextResponse.json({
          jobs: [], total: 0,
          stats: { total: 0, completed: 0, inProgress: 0, pending: 0, unassigned: 0 },
        });
      }
    }

    let query = supabase
      .from("job_cards")
      .select("*")
      .or("role.ilike.fc,move_to.ilike.fc,escalation_role.ilike.fc,move_to_role.ilike.fc");

    if (!showAllJobs && isFc && fcCostCodes.length > 0) {
      query = query.or(`new_account_number.in.(${fcCostCodes.map((c) => c.replace(/[^-.\w]/g, "")).join(",")}),role.ilike.fc`);
    }

    query = query.not("move_to", "ilike", "accounts");
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching FC jobs:", error);
      return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    const jobs = (data || []) as unknown as JobRecord[];

    const normalizeToken = (value: unknown) =>
      String(value || "").trim().toLowerCase();

    // Get invoice records for all jobs
    const jobIds = jobs.map((j) => String(j.id)).filter(Boolean);
    const jobNumbers = jobs.map((j) => String(j.job_number)).filter(Boolean);

    const invoicedJobIdSet = new Set<string>();
    const invoicedJobNumberSet = new Set<string>();

    if (jobIds.length > 0) {
      const { data: invoiceRows } = await supabase
        .from("invoices")
        .select("job_card_id, job_number")
        .in("job_card_id", jobIds);

      if (invoiceRows) {
        for (const row of invoiceRows) {
          if (row.job_card_id) invoicedJobIdSet.add(String(row.job_card_id));
          if (row.job_number) invoicedJobNumberSet.add(String(row.job_number));
        }
      }
    }

    if (jobNumbers.length > 0) {
      const { data: invoiceRowsByNumber } = await supabase
        .from("invoices")
        .select("job_card_id, job_number")
        .in("job_number", jobNumbers);

      if (invoiceRowsByNumber) {
        for (const row of invoiceRowsByNumber) {
          if (row.job_card_id) invoicedJobIdSet.add(String(row.job_card_id));
          if (row.job_number) invoicedJobNumberSet.add(String(row.job_number));
        }
      }
    }

    const allJobs = jobs.filter((job) => {
      const jobStatus = normalizeToken(job.job_status);
      const status = normalizeToken(job.status);
      const moveTo = normalizeToken(job.move_to);

      const isForwardedAway = moveTo !== "fc" && moveTo !== "";
      if (isForwardedAway) return false;

      if (jobStatus === "invoiced" || status === "invoiced") return false;

      const jobId = String(job.id || "").trim();
      const jobNum = String(job.job_number || "").trim();
      if (invoicedJobIdSet.has(jobId) || invoicedJobNumberSet.has(jobNum)) {
        return false;
      }

      const billingRaw = job.billing_statuses;
      const billing = typeof billingRaw === "string"
        ? (() => { try { return JSON.parse(billingRaw); } catch { return null; } })()
        : (billingRaw && typeof billingRaw === "object" ? billingRaw : null);

      if (billing) {
        const inv = (billing as Record<string, unknown>).invoice;
        if (inv === true) return false;
        if (typeof inv === "object" && inv !== null) {
          const invObj = inv as Record<string, unknown>;
          if (invObj.done === true || invObj.invoice_id || invObj.invoice_number || invObj.reference) {
            return false;
          }
        }
      }

      return true;
    });

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
