import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Fetch completed jobs where role is 'accounts' and job_status is 'Completed' or 'Invoiced'
    const baseQuery = () =>
      supabase
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
        .in("job_status", ["Completed", "completed", "Invoiced", "invoiced"]);

    const buildFilteredQuery = () => {
      let query = baseQuery();

      if (invoiceState === "invoiced") {
        query = query.in("job_status", ["Invoiced", "invoiced"]);
      } else if (invoiceState === "not_invoiced") {
        query = query.in("job_status", ["Completed", "completed"]);
      }

      if (search) {
        const escapedSearch = search.replace(/[%_,]/g, "");
        if (searchField === "job_number") {
          query = query.ilike("job_number", `%${escapedSearch}%`);
        } else {
          query = query.or(
            [
              `job_number.ilike.%${escapedSearch}%`,
              `customer_name.ilike.%${escapedSearch}%`,
              `customer_email.ilike.%${escapedSearch}%`,
            ].join(","),
          );
        }
      }

      return query.order("completion_date", { ascending: false });
    };

    const [jobsResult, invoicedCountResult, notInvoicedCountResult] =
      await Promise.all([
        buildFilteredQuery(),
        supabase
          .from("job_cards")
          .select("id", { count: "exact", head: true })
          .eq("role", "accounts")
          .in("job_status", ["Invoiced", "invoiced"]),
        supabase
          .from("job_cards")
          .select("id", { count: "exact", head: true })
          .eq("role", "accounts")
          .in("job_status", ["Completed", "completed"]),
      ]);

    const { data, error } = jobsResult;

    if (error) {
      console.error("Error fetching accounts completed jobs:", error);
      return NextResponse.json(
        { error: "Failed to fetch completed jobs" },
        { status: 500 },
      );
    }

    const invoicedByIds = Array.from(
      new Set(
        (data || [])
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
    const transformedJobs = (data || []).map((job) => {
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
        invoiced_by: effectiveInvoicedBy,
        invoiced_by_email: effectiveInvoicedBy
          ? userEmailById.get(effectiveInvoicedBy) || null
          : null,
      };
    });

    return NextResponse.json({
      jobs: transformedJobs,
      total: transformedJobs.length,
      counts: {
        invoiced: invoicedCountResult.count || 0,
        notInvoiced: notInvoicedCountResult.count || 0,
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
