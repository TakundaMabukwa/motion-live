import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const buildMoveHistoryEntry = (
  userId: string | null,
  userEmail: string | null,
  fromRole: string | null,
  toRole: string,
) => ({
  moved_by: userId,
  user_email: userEmail,
  from_role: fromRole,
  to_role: toRole,
  moved_at: new Date().toISOString(),
});

const fetchMoveHistory = async (
  supabase: ReturnType<typeof createClient>,
  jobId: string,
) => {
  const { data, error } = await supabase
    .from("job_cards")
    .select("move_history")
    .eq("id", jobId)
    .single();
  if (error || !data?.move_history) return null;
  const history = Array.isArray(data.move_history) ? data.move_history : [];
  return history as Record<string, unknown>[];
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const {
      destination,
      note,
      preserveCompleted,
      bypassEscalation,
      escalationOnly,
      inventoryPlacement,
    } = await request.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!id || !destination) {
      return NextResponse.json(
        { error: "Job ID and destination are required" },
        { status: 400 },
      );
    }

    const destinationNormalized = String(destination).trim().toLowerCase();
    const roleAliasMap: Record<string, "admin" | "accounts" | "fc" | "inv"> = {
      admin: "admin",
      inv: "inv",
      inventory: "inv",
      accounts: "accounts",
      account: "accounts",
      fc: "fc",
      finance: "fc",
    };
    const targetRole = roleAliasMap[destinationNormalized];

    if (!targetRole) {
      return NextResponse.json(
        {
          error: "Invalid destination role",
          allowed_roles: ["admin", "inv", "accounts", "fc"],
        },
        { status: 400 },
      );
    }

    const inventoryPlacementNormalized = String(inventoryPlacement || "")
      .trim()
      .toLowerCase();

    const { data: currentJob, error: currentJobError } = await supabase
      .from("job_cards")
      .select("role, move_to, completion_notes, status, job_status")
      .eq("id", id)
      .single();

    if (currentJobError || !currentJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    const sourceJobStatus = String(currentJob.job_status || "").trim().toLowerCase();
    const sourceStatus = String(currentJob.status || "").trim().toLowerCase();
    const sourceIsCompleted =
      sourceJobStatus === "completed" || sourceStatus === "completed";

    const sourceRole = String(
      currentJob.role || currentJob.move_to || "",
    ).trim().toLowerCase() || null;
    const shouldRouteDirectToAdminAwaiting =
      targetRole === "admin" && Boolean(bypassEscalation);
    const shouldPreserveCompletedForFc =
      targetRole === "fc" && (Boolean(preserveCompleted) || sourceIsCompleted);
    const shouldMoveAsCompleted =
      targetRole === "accounts" || shouldPreserveCompletedForFc;
    const shouldBypassEscalation =
      shouldMoveAsCompleted || shouldRouteDirectToAdminAwaiting;
    const escalationPayload = shouldBypassEscalation
      ? {
          escalation_role: null,
          escalation_source_role: null,
          escalated_at: null,
        }
      : {
          escalation_role: targetRole,
          escalation_source_role: sourceRole,
          escalated_at: new Date().toISOString(),
        };

    // Build the move log entry
    const moveEntry = buildMoveHistoryEntry(
      user?.id || null, user?.email || null,
      currentJob?.role || null, targetRole,
    );

    // Fetch existing move_history (safe: returns null if column doesn't exist)
    const existingHistory = await fetchMoveHistory(supabase, id);
    const updatedHistory = existingHistory
      ? [...existingHistory, moveEntry]
      : [moveEntry];

    // Completed-jobs handoff: preserve everything and only switch role to inventory.
    if (
      targetRole === "inv" &&
      inventoryPlacementNormalized === "completed-jobs"
    ) {
      const { data: inventoryRoleOnlyJob, error: inventoryRoleOnlyError } =
        await supabase
          .from("job_cards")
          .update({
            role: "inv",
            move_to: null,
            move_history: updatedHistory,
          })
          .eq("id", id)
          .select()
          .single();

      if (inventoryRoleOnlyError) {
        return NextResponse.json(
          {
            error: "Failed to set Inventory role",
            details: inventoryRoleOnlyError.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Job role changed to Inventory",
        job: inventoryRoleOnlyJob,
      });
    }

    if (Boolean(escalationOnly)) {
      const { data: escalatedJob, error: escalationOnlyError } = await supabase
        .from("job_cards")
        .update({
          escalation_role: targetRole,
          escalation_source_role: sourceRole,
          escalated_at: new Date().toISOString(),
          move_history: updatedHistory,
        })
        .eq("id", id)
        .select()
        .single();

      if (escalationOnlyError) {
        return NextResponse.json(
          {
            error: `Failed to move job to ${targetRole.toUpperCase()} escalations`,
            details: escalationOnlyError.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Job moved to ${targetRole.toUpperCase()} escalation queue`,
        job: escalatedJob,
      });
    }

    // Completed destinations (Accounts and FC with preserveCompleted=true) should avoid escalation.
    // Other role-to-role moves should stay active/pending and surface via escalations.
    if (["fc", "inv", "accounts"].includes(targetRole)) {
      let nextCompletionNotes: string | null | undefined;

      if (typeof note === "string" && note.trim()) {
        const trimmedNote = note.trim();
        const existingNotes = String(currentJob?.completion_notes || "").trim();
        nextCompletionNotes = existingNotes
          ? `${existingNotes}\n\n[Move note to ${targetRole.toUpperCase()}]\n${trimmedNote}`
          : `[Move note to ${targetRole.toUpperCase()}]\n${trimmedNote}`;
      }

      const completionPayload = shouldMoveAsCompleted
        ? {
            role: targetRole,
            move_to: targetRole,
            move_to_role: null,
            status: "completed",
            job_status: "Completed",
            completion_date: new Date().toISOString(),
            end_time: new Date().toISOString(),
            ...escalationPayload,
            move_history: updatedHistory,
            ...(targetRole === "fc" ? { fc_note_acknowledged: false } : {}),
            ...(nextCompletionNotes ? { completion_notes: nextCompletionNotes } : {}),
          }
        : {
            role: targetRole,
            move_to: targetRole,
            move_to_role: null,
            status: "pending",
            job_status: "pending",
            completion_date: null,
            end_time: null,
            ...escalationPayload,
            move_history: updatedHistory,
            ...(targetRole === "fc" ? { fc_note_acknowledged: false } : {}),
            ...(nextCompletionNotes ? { completion_notes: nextCompletionNotes } : {}),
          };

      const patchUrl = `${new URL(request.url).origin}/api/job-cards/${id}`;
      const patchResponse = await fetch(patchUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: request.headers.get("Authorization") || "",
          Cookie: request.headers.get("Cookie") || "",
        },
        body: JSON.stringify(completionPayload),
      });

      const patchBody = await patchResponse.json().catch(() => ({}));

      if (!patchResponse.ok) {
        return NextResponse.json(
          {
            error:
              targetRole === "accounts"
                ? "Failed to complete and move job to Accounts"
                : `Failed to move job to ${targetRole.toUpperCase()}`,
            details: patchBody?.error || patchBody?.details || "Unknown error",
          },
          { status: patchResponse.status },
        );
      }

      return NextResponse.json({
        success: true,
        message:
          targetRole === "accounts"
            ? "Job moved to Accounts and marked as completed"
            : shouldPreserveCompletedForFc
              ? "Job moved to FC and kept in completed review queue"
            : `Job moved to ${targetRole.toUpperCase()} escalation queue`,
        job: patchBody,
      });
    }

    const { data, error } = await supabase
      .from("job_cards")
      .update({
        role: targetRole,
        move_to: targetRole,
        move_to_role: null,
        move_history: updatedHistory,
        ...escalationPayload,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: shouldRouteDirectToAdminAwaiting
        ? "Job moved to Admin awaiting technician queue"
        : `Job moved to ${destination}`,
      job: data,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error moving job card:", error);
    return NextResponse.json(
      { error: "Failed to move job card", details: errorMessage },
      { status: 500 },
    );
  }
}
