import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const COMPLETED_JOB_FIELDS = [
  "id",
  "job_number",
  "order_number",
  "job_date",
  "due_date",
  "completion_date",
  "created_at",
  "updated_at",
  "start_time",
  "end_time",
  "status",
  "job_status",
  "job_type",
  "job_description",
  "priority",
  "role",
  "move_to",
  "escalation_role",
  "repair",
  "customer_name",
  "customer_email",
  "customer_phone",
  "customer_address",
  "contact_person",
  "new_account_number",
  "vehicle_registration",
  "vehicle_make",
  "vehicle_model",
  "vehicle_year",
  "vin_numer",
  "odormeter",
  "ip_address",
  "qr_code",
  "technician_name",
  "technician_phone",
  "assigned_technician_id",
  "job_location",
  "site_contact_person",
  "site_contact_phone",
  "latitude",
  "longitude",
  "estimated_duration_hours",
  "actual_duration_hours",
  "estimated_cost",
  "actual_cost",
  "quotation_number",
  "quote_status",
  "quote_type",
  "quotation_job_type",
  "purchase_type",
  "quote_date",
  "quote_expiry_date",
  "quotation_subtotal",
  "quotation_vat_amount",
  "quotation_total_amount",
  "quotation_products",
  "parts_required",
  "products_required",
  "equipment_used",
  "safety_checklist_completed",
  "quality_check_passed",
  "customer_signature_obtained",
  "before_photos",
  "after_photos",
  "documents",
  "special_instructions",
  "access_requirements",
  "work_notes",
  "completion_notes",
  "customer_feedback",
  "customer_satisfaction_rating",
  "created_by",
  "billing_statuses",
].join(", ");

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For FC users, get their assigned cost codes
    const { data: fcCostCenters } = await supabase
      .from('cost_centers')
      .select('cost_code')
      .eq('fc_id', user.id)
      .not('cost_code', 'is', null);

    const fcCostCodes = [...new Set(
      (fcCostCenters || [])
        .map((cc) => String(cc.cost_code || '').trim())
        .filter(Boolean)
    )];

    if (fcCostCodes.length === 0) {
      return NextResponse.json({ jobs: [], fcUsers: [], total: 0 });
    }

    const { data, error } = await supabase
      .from("job_cards")
      .select(COMPLETED_JOB_FIELDS)
      .in("new_account_number", fcCostCodes)
      .or("role.ilike.fc,move_to.ilike.fc,escalation_role.ilike.fc")
      .not("move_to", "ilike", "accounts")
      .order("completion_date", { ascending: false });

    if (error) {
      console.error("Error fetching FC completed jobs:", error);
      return NextResponse.json(
        { error: "Failed to fetch completed jobs" },
        { status: 500 },
      );
    }

    const normalizeToken = (value: unknown) =>
      String(value || "").trim().toLowerCase();

    const jobs = (data || []).filter((job) => {
      const status = normalizeToken(job.status);
      const jobStatus = normalizeToken(job.job_status);
      const role = normalizeToken(job.role);
      const moveTo = normalizeToken(job.move_to);
      const escalationRole = normalizeToken(job.escalation_role);
      const isCompleted = status === "completed" || jobStatus === "completed";

      const isForwardedAway = moveTo !== "fc" && moveTo !== "";
      const belongsToFcReview =
        !isForwardedAway &&
        (role === "fc" || moveTo === "fc" || escalationRole === "fc");
      if (!belongsToFcReview) return false;
      if (!isCompleted) return false;
      return true;
    });

    // Look up invoices for these jobs to filter out invoiced ones
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

    const nonInvoicedJobs = jobs.filter((job) => {
      // Exclude by job_status
      const jobStatus = normalizeToken(job.job_status);
      if (jobStatus === "invoiced") return false;

      const jobId = String(job.id || "").trim();
      const jobNum = String(job.job_number || "").trim();

      // Exclude if there's an invoice record for this job
      if (invoicedJobIdSet.has(jobId) || invoicedJobNumberSet.has(jobNum)) {
        return false;
      }

      // Also check billing_statuses as a fallback
      const billing = job.billing_statuses;
      if (
        billing &&
        typeof billing === "object" &&
        billing.invoice &&
        (billing.invoice === true ||
          (typeof billing.invoice === "object" &&
            (billing.invoice.done === true ||
              billing.invoice.invoice_id ||
              billing.invoice.invoice_number ||
              billing.invoice.reference)))
      ) {
        return false;
      }

      return true;
    });

    const creatorIds = Array.from(
      new Set(
        nonInvoicedJobs
          .map((job) => String(job.created_by || "").trim())
          .filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
      ),
    );

    let creatorLookup = new Map<
      string,
      { email: string | null; company: string | null }
    >();

    if (creatorIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, email, company")
        .in("id", creatorIds);

      if (usersError) {
        console.error("Error fetching FC job creators:", usersError);
      } else {
        creatorLookup = new Map(
          (users || []).map((user) => [
            String(user.id),
            {
              email: user.email || null,
              company: user.company || null,
            },
          ]),
        );
      }
    }

    const { data: fcUsers, error: fcUsersError } = await supabase
      .from("users")
      .select("email")
      .or("role.eq.fc,secondary_role.eq.fc")
      .not("email", "is", null)
      .order("email", { ascending: true });

    if (fcUsersError) {
      console.error("Error fetching FC users:", fcUsersError);
    }

    const fcUserEmails = Array.from(
      new Set(
        [
          ...((fcUsers || [])
            .map((user) => String(user.email || "").trim())
            .filter(Boolean)),
          "monique@soltrack.co.za",
        ].sort((a, b) => a.localeCompare(b)),
      ),
    );

    const enrichedJobs = nonInvoicedJobs.map((job) => {
      const creatorId = String(job.created_by || "").trim();
      const creator = creatorLookup.get(creatorId);
      return {
        ...job,
        creator_email: creator?.email || null,
        creator_company: creator?.company || null,
        creator_label:
          creator?.email || creator?.company || creatorId || "Unknown",
      };
    });

    return NextResponse.json({
      jobs: enrichedJobs,
      fcUsers: fcUserEmails,
      total: enrichedJobs.length,
    });
  } catch (error) {
    console.error("Error in FC completed jobs GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
