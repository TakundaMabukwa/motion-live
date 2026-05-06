import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { count, error } = await supabase
      .from("job_cards")
      .select("id", { count: "exact", head: true })
      .eq("escalation_role", "fc")
      .not("job_status", "in", "(\"Completed\",\"completed\")")
      .not("status", "in", "(\"Completed\",\"completed\")");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch From Ria count" },
        { status: 500 },
      );
    }

    const pendingCount = Number(count || 0);

    return NextResponse.json({ pendingCount });
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
