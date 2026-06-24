import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await serviceSupabase
      .from("credit_notes")
      .update({ approved: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error approving credit note:", error);
      return NextResponse.json({ error: "Failed to approve credit note" }, { status: 500 });
    }

    return NextResponse.json({ success: true, creditNote: data });
  } catch (error) {
    console.error("Error in credit note approve:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
