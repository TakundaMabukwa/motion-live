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
    const assignments: { costCenterId: string; fcUserId: string }[] = body?.assignments;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: "assignments array is required with at least one item" },
        { status: 400 },
      );
    }

    // Validate all entries
    for (const a of assignments) {
      if (!a.costCenterId || !a.fcUserId) {
        return NextResponse.json(
          { error: "Each assignment must have costCenterId and fcUserId" },
          { status: 400 },
        );
      }
    }

    // Verify all target FC users have FC role (deduplicate)
    const uniqueFcUserIds = [...new Set(assignments.map((a) => a.fcUserId))];
    const { data: fcUsers, error: fcUsersError } = await supabase
      .from("users")
      .select("id, email")
      .in("id", uniqueFcUserIds)
      .or("role.eq.fc,secondary_role.eq.fc");

    if (fcUsersError || !fcUsers || fcUsers.length !== uniqueFcUserIds.length) {
      return NextResponse.json(
        { error: "One or more selected FC users not found or do not have FC role" },
        { status: 400 },
      );
    }

    const fcUserMap = new Map(fcUsers.map((u) => [u.id, u.email]));

    // Get caller role
    const { data: callerData } = await supabase
      .from("users")
      .select("role, secondary_role")
      .eq("id", user.id)
      .single();

    const isCallerFc = callerData?.role === "fc";

    // Get all cost centers
    const costCenterIds = assignments.map((a) => a.costCenterId);
    const { data: costCenters, error: ccError } = await supabase
      .from("cost_centers")
      .select("id, fc_id")
      .in("id", costCenterIds);

    if (ccError || !costCenters || costCenters.length !== costCenterIds.length) {
      return NextResponse.json(
        { error: "One or more cost centers not found" },
        { status: 404 },
      );
    }

    const costCenterMap = new Map(costCenters.map((cc) => [cc.id, cc]));

    // Check permissions for each assignment
    for (const a of assignments) {
      const cc = costCenterMap.get(a.costCenterId);
      if (!cc) {
        return NextResponse.json(
          { error: `Cost center ${a.costCenterId} not found` },
          { status: 404 },
        );
      }
      if (isCallerFc) {
        if (a.fcUserId !== user.id) {
          return NextResponse.json(
            { error: "FC users can only assign themselves" },
            { status: 403 },
          );
        }
        if (cc.fc_id) {
          return NextResponse.json(
            { error: `Cost center ${a.costCenterId} already has an FC assigned` },
            { status: 409 },
          );
        }
      }
    }

    // Bulk update all cost centers
    const updateValues = assignments.map((a) => ({
      id: a.costCenterId,
      fc_id: a.fcUserId,
    }));

    const updatePromises = updateValues.map((v) =>
      supabase
        .from("cost_centers")
        .update({ fc_id: v.fc_id })
        .eq("id", v.id)
        .select("id, cost_code, company, fc_id")
        .single(),
    );

    const results = await Promise.all(updatePromises);
    const updatedCostCenters = results.map((r, i) => {
      if (r.error) {
        return { id: assignments[i].costCenterId, error: r.error.message };
      }
      return {
        ...r.data,
        fc_email: fcUserMap.get(r.data.fc_id) || null,
      };
    });

    return NextResponse.json({
      success: true,
      costCenters: updatedCostCenters,
    });
  } catch (error) {
    console.error("Bulk assign FC error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
