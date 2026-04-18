import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TRACKED_ROLE_KEYS = ["fc", "inv", "admin", "tech", "accounts"];

const normalizeRole = (role: string | null | undefined) => {
  const raw = String(role || "").trim().toLowerCase();
  if (raw === "technician" || raw === "tech") return "tech";
  if (TRACKED_ROLE_KEYS.includes(raw)) return raw;
  return raw || "unassigned";
};

const getAgeDays = (value: string | null | undefined) => {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

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
  actual_cost?: number | string | null;
}) => {
  const productTotal = parseQuotationProducts(job.quotation_products).reduce(
    (sum, product) => {
      const totalPrice = Number(product?.total_price || 0);
      return Number.isFinite(totalPrice) && totalPrice > 0
        ? sum + totalPrice
        : sum;
    },
    0,
  );

  if (productTotal > 0) {
    return productTotal;
  }

  const candidates = [
    job.quotation_total_amount,
    job.estimated_cost,
    job.actual_cost,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate || 0);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get("search") || "").trim();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
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
        priority,
        job_type,
        job_description,
        new_account_number,
        technician_name,
        quotation_products,
        quotation_total_amount,
        estimated_cost,
        actual_cost,
        created_at,
        updated_at
      `,
      )
      .in("role", ["fc", "inv", "admin", "accounts", "tech", "technician"])
      .not("job_status", "in", '("Completed","completed","Invoiced","invoiced")')
      .order("updated_at", { ascending: true });

    if (search) {
      const escapedSearch = search.replace(/[%_,]/g, "");
      query = query.or(
        [
          `job_number.ilike.%${escapedSearch}%`,
          `customer_name.ilike.%${escapedSearch}%`,
          `vehicle_registration.ilike.%${escapedSearch}%`,
          `new_account_number.ilike.%${escapedSearch}%`,
          `technician_name.ilike.%${escapedSearch}%`,
        ].join(","),
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching accounts job pool:", error);
      return NextResponse.json(
        { error: "Failed to fetch job pool" },
        { status: 500 },
      );
    }

    const counts = TRACKED_ROLE_KEYS.reduce<Record<string, number>>(
      (accumulator, roleKey) => {
        accumulator[roleKey] = 0;
        return accumulator;
      },
      {},
    );
    const totals = TRACKED_ROLE_KEYS.reduce<Record<string, number>>(
      (accumulator, roleKey) => {
        accumulator[roleKey] = 0;
        return accumulator;
      },
      {},
    );

    const jobs = (data || []).map((job) => {
      const normalizedRole = normalizeRole(job.role);
      const hasTechnician = String(job.technician_name || "").trim().length > 0;
      const jobValue = getJobValue(job);

      if (
        normalizedRole !== "tech" &&
        Object.prototype.hasOwnProperty.call(counts, normalizedRole)
      ) {
        counts[normalizedRole] += 1;
        totals[normalizedRole] += jobValue;
      }

      if (hasTechnician) {
        counts.tech += 1;
        totals.tech += jobValue;
      }

      const roleAssignedAt = job.updated_at || job.created_at;
      return {
        ...job,
        normalized_role: normalizedRole,
        is_tech_assigned: hasTechnician,
        job_value: jobValue,
        role_assigned_at: roleAssignedAt,
        role_age_days: getAgeDays(roleAssignedAt),
      };
    });

    return NextResponse.json({
      jobs,
      counts,
      totals,
      total: jobs.length,
    });
  } catch (error) {
    console.error("Error in accounts job pool GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
