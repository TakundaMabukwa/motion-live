import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callXeroApi, getXeroConnectionStatus, getXeroTokenScopes } from "@/lib/server/xero";

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

    const envStatus = getXeroConnectionStatus();
    const { tokenResponse, scopes, jwtPayload } = await getXeroTokenScopes();

    const orgProbe = await callXeroApi("/api.xro/2.0/Organisation", {
      method: "GET",
    });

    return NextResponse.json({
      mode: envStatus.isCustomConnectionCandidate ? "custom_connection_candidate" : "oauth2",
      envStatus,
      token: {
        expiresIn: tokenResponse.expires_in,
        scopes,
        audience: jwtPayload?.aud || null,
      },
      probes: {
        organisation: {
          ok: orgProbe.ok,
          status: orgProbe.status,
          body: orgProbe.body,
        },
      },
      readiness: {
        canRequestToken: envStatus.hasClientId && envStatus.hasClientSecret,
        hasAccountingScope:
          scopes.includes("accounting.transactions") ||
          scopes.includes("accounting.invoices"),
      },
    });
  } catch (error) {
    console.error("Xero status route failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to inspect Xero status" },
      { status: 500 },
    );
  }
}
