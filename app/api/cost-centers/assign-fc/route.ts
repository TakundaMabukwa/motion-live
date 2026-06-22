import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const costCenterId = String(body?.costCenterId || "").trim();
    const fcUserId = String(body?.fcUserId || "").trim();

    if (!costCenterId || !fcUserId) {
      return NextResponse.json(
        { error: "costCenterId and fcUserId are required" },
        { status: 400 },
      );
    }

    // Run all checks in parallel
    const [fcUserResult, callerResult, costCenterResult] = await Promise.all([
      supabase.from("users").select("id, email").or("role.eq.fc,secondary_role.eq.fc").eq("id", fcUserId).maybeSingle(),
      supabase.from("users").select("role, secondary_role").eq("id", user.id).single(),
      supabase.from("cost_centers").select("id, fc_id").eq("id", costCenterId).maybeSingle(),
    ]);

    const { data: fcUser, error: fcUserError } = fcUserResult;
    const { data: callerData } = callerResult;
    const { data: costCenter, error: ccError } = costCenterResult;

    if (fcUserError || !fcUser) {
      return NextResponse.json(
        { error: "Selected FC user not found or does not have FC role" },
        { status: 400 },
      );
    }

    if (ccError || !costCenter) {
      return NextResponse.json(
        { error: "Cost center not found" },
        { status: 404 },
      );
    }

    const isCallerFc = callerData?.role === "fc";

    // If caller is FC, they can only assign themselves to an unassigned cost center
    if (isCallerFc) {
      if (fcUserId !== user.id) {
        return NextResponse.json(
          { error: "FC users can only assign themselves" },
          { status: 403 },
        );
      }

      if (costCenter.fc_id) {
        return NextResponse.json(
          { error: "This cost center already has an FC assigned" },
          { status: 409 },
        );
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("cost_centers")
      .update({ fc_id: fcUserId })
      .eq("id", costCenterId)
      .select("id, cost_code, company, fc_id")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to assign FC" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      costCenter: {
        ...updated,
        fc_email: fcUser.email,
      },
    });
  } catch (error) {
    console.error("Assign FC error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
