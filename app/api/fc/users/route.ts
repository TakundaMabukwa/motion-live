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

    const { data: currentUserData } = await supabase
      .from("users")
      .select("role, secondary_role")
      .eq("id", user.id)
      .single();

    const { data: fcUsers, error } = await supabase
      .from("users")
      .select("id, email")
      .or("role.eq.fc,secondary_role.eq.fc")
      .not("email", "is", null)
      .order("email", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch FC users" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      fcUsers: fcUsers || [],
      currentUserId: user.id,
      currentUserRole: currentUserData?.role || "",
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
