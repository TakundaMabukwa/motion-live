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
].join(", ");

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch completed jobs where role is 'fc' and job_status is completed.
    const { data, error } = await supabase
      .from("job_cards")
      .select(COMPLETED_JOB_FIELDS)
      .eq("role", "fc")
      .in("job_status", ["Completed", "completed"])
      .order("completion_date", { ascending: false });

    if (error) {
      console.error("Error fetching FC completed jobs:", error);
      return NextResponse.json(
        { error: "Failed to fetch completed jobs" },
        { status: 500 },
      );
    }

    const jobs = (data || []).filter(
      (job) => String(job.escalation_role || "").toLowerCase() !== "fc",
    );
    const creatorIds = Array.from(
      new Set(
        jobs
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
      .eq("role", "fc")
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

    const enrichedJobs = jobs.map((job) => {
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
