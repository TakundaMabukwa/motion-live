import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const { destination, note, inventoryPlacement, preserveCompleted } =
      await request.json();

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

    // Inventory, Accounts, and FC review display these inside their completed/review tabs.
    if (["fc", "inv", "accounts"].includes(targetRole)) {
      let nextCompletionNotes: string | null | undefined;

      if (typeof note === "string" && note.trim()) {
        const { data: existingJob } = await supabase
          .from("job_cards")
          .select("completion_notes")
          .eq("id", id)
          .maybeSingle();

        const trimmedNote = note.trim();
        const existingNotes = String(existingJob?.completion_notes || "").trim();
        nextCompletionNotes = existingNotes
          ? `${existingNotes}\n\n[Move note to ${targetRole.toUpperCase()}]\n${trimmedNote}`
          : `[Move note to ${targetRole.toUpperCase()}]\n${trimmedNote}`;
      }

      const shouldSendInventoryToAssignParts =
        targetRole === "inv" && inventoryPlacement === "assign-parts";
      const shouldPreserveCompleted =
        targetRole === "fc" ? true : Boolean(preserveCompleted);

      const completionPayload =
        shouldSendInventoryToAssignParts
            ? {
                role: "inv",
                move_to: "inv",
                status: "pending",
                job_status: "pending",
                completion_date: null,
                end_time: null,
                ...(nextCompletionNotes ? { completion_notes: nextCompletionNotes } : {}),
              }
          : {
              role: targetRole,
              move_to: targetRole,
              status: "completed",
              job_status: "Completed",
              completion_date: new Date().toISOString(),
              end_time: new Date().toISOString(),
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
              targetRole === "fc"
                ? "Failed to move job to FC"
                : `Failed to complete and move job to ${targetRole.toUpperCase()}`,
            details: patchBody?.error || patchBody?.details || "Unknown error",
          },
          { status: patchResponse.status },
        );
      }

      return NextResponse.json({
        success: true,
        message:
          targetRole === "fc"
            ? "Job moved to FC and kept as completed"
            : shouldSendInventoryToAssignParts
              ? "Job moved to Inventory Assign Parts"
            : `Job moved to ${targetRole.toUpperCase()} and marked as completed`,
        job: patchBody,
      });
    }

    const { data, error } = await supabase
      .from("job_cards")
      .update({
        status: `moved_to_${targetRole}`,
        role: targetRole,
        move_to: targetRole,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Job moved to ${destination}`,
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
