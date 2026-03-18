import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Fetch completed jobs where role is 'fc' and job_status is 'Completed'.
    // Select all columns so FC screens can use full job-card context.
    const { data, error } = await supabase
      .from("job_cards")
      .select("*")
      .eq("role", "fc")
      .eq("job_status", "Completed")
      .order("completion_date", { ascending: false });

    if (error) {
      console.error("Error fetching FC completed jobs:", error);
      return NextResponse.json(
        { error: "Failed to fetch completed jobs" },
        { status: 500 },
      );
    }

    const jobs = data || [];
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
