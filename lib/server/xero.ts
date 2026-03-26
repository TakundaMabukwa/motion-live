type XeroTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export type XeroConnectionStatus = {
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRedirectUri: boolean;
  hasRefreshToken: boolean;
  hasTenantId: boolean;
  isCustomConnectionCandidate: boolean;
};

const readEnv = (name: string) => {
  const value = process.env[name];
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const getXeroConnectionStatus = (): XeroConnectionStatus => {
  const hasClientId = Boolean(readEnv("XERO_CLIENT_ID"));
  const hasClientSecret = Boolean(readEnv("XERO_CLIENT_SECRET"));
  const hasRedirectUri = Boolean(readEnv("XERO_REDIRECT_URI"));
  const hasRefreshToken = Boolean(readEnv("XERO_REFRESH_TOKEN"));
  const hasTenantId = Boolean(readEnv("XERO_TENANT_ID"));

  return {
    hasClientId,
    hasClientSecret,
    hasRedirectUri,
    hasRefreshToken,
    hasTenantId,
    isCustomConnectionCandidate: hasClientId && hasClientSecret && !hasRefreshToken,
  };
};

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
};

export const decodeJwtPayload = (token: string) => {
  const segments = String(token || "").split(".");
  if (segments.length < 2) {
    throw new Error("Unexpected JWT format");
  }

  return JSON.parse(base64UrlDecode(segments[1] || ""));
};

export const getXeroAccessToken = async (): Promise<XeroTokenResponse> => {
  const clientId = readEnv("XERO_CLIENT_ID");
  const clientSecret = readEnv("XERO_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Missing XERO_CLIENT_ID or XERO_CLIENT_SECRET");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  const rawText = await response.text();
  let body: Record<string, unknown> | null = null;

  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = { raw: rawText };
  }

  if (!response.ok) {
    throw new Error(
      `Xero token request failed (${response.status}): ${body?.error_description || body?.error || rawText || "Unknown error"}`,
    );
  }

  return body as XeroTokenResponse;
};

export const getXeroTokenScopes = async () => {
  const tokenResponse = await getXeroAccessToken();
  const payload = decodeJwtPayload(tokenResponse.access_token);
  const scopes = Array.isArray(payload?.scp)
    ? payload.scp.map((scope: unknown) => String(scope))
    : typeof payload?.scope === "string"
      ? String(payload.scope)
          .split(" ")
          .map((scope) => scope.trim())
          .filter(Boolean)
      : [];

  return {
    tokenResponse,
    scopes,
    jwtPayload: payload,
  };
};

export const callXeroApi = async <T = unknown>(
  path: string,
  init?: RequestInit,
) => {
  const { tokenResponse } = await getXeroTokenScopes();

  const response = await fetch(`https://api.xero.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${tokenResponse.access_token}`,
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const rawText = await response.text();
  let body: unknown = null;

  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = rawText;
  }

  return {
    ok: response.ok,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: body as T,
  };
};
