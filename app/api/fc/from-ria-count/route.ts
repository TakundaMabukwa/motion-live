import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function extractFcMoveNote(notes: string) {
  const trimmed = String(notes || "").trim();
  if (!trimmed) return "";

  const sections = trimmed
    .split(/\[Move note to FC\]/gi)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sections.length > 0) {
    return sections[sections.length - 1].split(/\n{2,}/)[0].trim();
  }

  return trimmed;
}

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

    const { data, error } = await supabase
      .from("job_cards")
      .select("completion_notes, fc_note_acknowledged, role, move_to, status, job_status")
      .eq("fc_note_acknowledged", false)
      .not("completion_notes", "is", null)
      .or([
        "role.eq.fc",
        "move_to.eq.fc",
        "status.eq.moved_to_fc",
        "status.eq.completed",
        "job_status.eq.created",
      ].join(","));

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch From Ria count" },
        { status: 500 },
      );
    }

    const pendingCount = (data || []).filter((job) => {
      const hasNote = Boolean(extractFcMoveNote(job?.completion_notes || ""));
      return hasNote && !Boolean(job?.fc_note_acknowledged);
    }).length;

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
