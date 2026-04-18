import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GLOBAL_SUMMARY_LOOKBACK_DAYS = 60;
const GLOBAL_SUMMARY_LIMIT = 1500;

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

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - GLOBAL_SUMMARY_LOOKBACK_DAYS);
    const recentJobsLookbackDate = new Date();
    recentJobsLookbackDate.setDate(recentJobsLookbackDate.getDate() - 1);

    const [recentJobsResponse, accountRowsResponse] = await Promise.all([
      supabase
        .from("job_cards")
        .select(
          "id, job_number, job_type, job_description, status, job_status, customer_name, customer_email, vehicle_registration, created_at, updated_at, account_id, new_account_number, quotation_total_amount, priority",
        )
        .gte("created_at", recentJobsLookbackDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("job_cards")
        .select(
          "new_account_number, customer_name, quotation_total_amount, job_status, updated_at",
        )
        .gte("updated_at", lookbackDate.toISOString())
        .order("updated_at", { ascending: false })
        .limit(GLOBAL_SUMMARY_LIMIT),
    ]);

    if (recentJobsResponse.error || accountRowsResponse.error) {
      return NextResponse.json(
        {
          error:
            recentJobsResponse.error?.message ||
            accountRowsResponse.error?.message ||
            "Failed to fetch FC global summary",
        },
        { status: 500 },
      );
    }

    const recentJobs = Array.isArray(recentJobsResponse.data)
      ? recentJobsResponse.data
      : [];
    const accountRows = Array.isArray(accountRowsResponse.data)
      ? accountRowsResponse.data
      : [];

    const accountMap = new Map();
    for (const job of accountRows) {
      const accountNumber = String(job.new_account_number || "Unknown").trim() || "Unknown";
      const totalAmount = Number(job.quotation_total_amount || 0) || 0;
      const jobStatus = String(job.job_status || "").trim().toLowerCase();

      const existing = accountMap.get(accountNumber);
      if (existing) {
        existing.total_jobs += 1;
        existing.total_value += totalAmount;
        if (jobStatus !== "completed") {
          existing.open_jobs += 1;
        }
        if (
          new Date(job.updated_at || 0).getTime() >
          new Date(existing.last_activity || 0).getTime()
        ) {
          existing.last_activity = job.updated_at;
        }
      } else {
        accountMap.set(accountNumber, {
          account_number: accountNumber,
          company_name: job.customer_name || "Unknown Company",
          total_jobs: 1,
          open_jobs: jobStatus !== "completed" ? 1 : 0,
          total_value: totalAmount,
          last_activity: job.updated_at,
        });
      }
    }

    return NextResponse.json({
      recentJobs,
      accountSummaries: Array.from(accountMap.values()),
      sampledJobs: accountRows.length,
      lookbackDays: GLOBAL_SUMMARY_LOOKBACK_DAYS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
