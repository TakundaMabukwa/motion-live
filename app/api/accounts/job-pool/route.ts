import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TRACKED_ROLE_KEYS = [
  "fc",
  "inv",
  "admin",
  "tech",
  "accounts",
  "unassigned",
] as const;
const CLOSED_STATUSES = new Set([
  "completed",
  "invoiced",
  "closed",
  "cancelled",
  "canceled",
]);

const ROLE_ALIASES: Record<string, (typeof TRACKED_ROLE_KEYS)[number]> = {
  fc: "fc",
  "field coordinator": "fc",
  field_coordinator: "fc",
  "field-coordinator": "fc",
  inv: "inv",
  inventory: "inv",
  admin: "admin",
  administrator: "admin",
  tech: "tech",
  technician: "tech",
  accounts: "accounts",
  account: "accounts",
  unassigned: "unassigned",
};

const normalizeToken = (value: string | null | undefined) =>
  String(value || "").trim().toLowerCase();

const normalizeRole = (role: string | null | undefined) =>
  ROLE_ALIASES[normalizeToken(role)] || null;

const isClosedJob = (job: {
  status?: string | null;
  job_status?: string | null;
}) =>
  CLOSED_STATUSES.has(normalizeToken(job.job_status)) ||
  CLOSED_STATUSES.has(normalizeToken(job.status));

const deriveBoardRole = (job: {
  escalation_role?: string | null;
  move_to?: string | null;
  role?: string | null;
  status?: string | null;
}) =>
  normalizeRole(job.escalation_role) ||
  normalizeRole(job.move_to) ||
  (["admin_created", "moved_to_admin"].includes(normalizeToken(job.status))
    ? "admin"
    : null) ||
  normalizeRole(job.role) ||
  "unassigned";

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
        escalation_role,
        move_to,
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
        assigned_technician_id,
        updated_at
      `,
      )
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

    const openJobs = (data || []).filter((job) => !isClosedJob(job));

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

    const jobs = openJobs.map((job) => {
      const normalizedRole = deriveBoardRole(job);
      const hasTechnician =
        String(job.technician_name || "").trim().length > 0 ||
        String(job.assigned_technician_id || "").trim().length > 0;
      const jobValue = getJobValue(job);

      if (
        normalizedRole !== "tech" &&
        !(normalizedRole === "unassigned" && hasTechnician) &&
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
