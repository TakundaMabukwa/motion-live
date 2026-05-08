import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LOCK_KEY = "completed_jobs_invoicing";

const normalizeLockDate = (input: string) => {
  const raw = String(input || "").trim();
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
};

async function getLockRow(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("accounts_completed_jobs_locks")
    .select("*")
    .eq("lock_key", LOCK_KEY)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function enrichLockRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lockRow: Record<string, unknown> | null,
) {
  if (!lockRow) {
    return {
      lock_key: LOCK_KEY,
      is_locked: false,
      lock_date: null,
      locked_by: null,
      locked_at: null,
      unlocked_by: null,
      unlocked_at: null,
      locked_by_email: null,
    };
  }

  const lockedBy = String(lockRow.locked_by || "").trim();
  if (!lockedBy) {
    return {
      ...lockRow,
      locked_by_email: null,
    };
  }

  const { data: lockedUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", lockedBy)
    .maybeSingle();

  return {
    ...lockRow,
    locked_by_email: lockedUser?.email || null,
  };
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

    const lockRow = await getLockRow(supabase);
    const lock = await enrichLockRow(supabase, lockRow);
    return NextResponse.json({ lock });
  } catch (error) {
    console.error("Error fetching completed jobs lock:", error);
    return NextResponse.json(
      { error: "Failed to fetch completed jobs lock" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const isLocked = Boolean(body?.isLocked);
    const lockDateInput = String(body?.lockDate || "").trim();
    const lockDate = isLocked ? normalizeLockDate(lockDateInput) : null;

    if (isLocked && !lockDate) {
      return NextResponse.json(
        { error: "lockDate (YYYY-MM-DD) is required when locking" },
        { status: 400 },
      );
    }

    const existing = await getLockRow(supabase);

    if (!existing) {
      const { error: insertError } = await supabase
        .from("accounts_completed_jobs_locks")
        .insert({
          lock_key: LOCK_KEY,
          is_locked: isLocked,
          lock_date: lockDate,
          locked_by: isLocked ? user.id : null,
          locked_at: isLocked ? new Date().toISOString() : null,
          unlocked_by: isLocked ? null : user.id,
          unlocked_at: isLocked ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }
    } else {
      const { error: updateError } = await supabase
        .from("accounts_completed_jobs_locks")
        .update({
          is_locked: isLocked,
          lock_date: lockDate,
          locked_by: isLocked ? user.id : null,
          locked_at: isLocked ? new Date().toISOString() : null,
          unlocked_by: isLocked ? null : user.id,
          unlocked_at: isLocked ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        throw updateError;
      }
    }

    const latest = await getLockRow(supabase);
    const lock = await enrichLockRow(supabase, latest);

    return NextResponse.json({
      lock,
      message: isLocked
        ? `Completed jobs locked from ${lock.lock_date || lockDate}`
        : "Completed jobs unlocked",
    });
  } catch (error) {
    console.error("Error updating completed jobs lock:", error);
    return NextResponse.json(
      { error: "Failed to update completed jobs lock" },
      { status: 500 },
    );
  }
}
