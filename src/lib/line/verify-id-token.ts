import "server-only";

export type LineIdentity = {
  /** LINE userId (U + 32 hex) — the only trusted source of who is calling. */
  sub: string;
  name: string | null;
  picture: string | null;
};

/** The token itself was rejected (bad, expired, or for another channel): answer 401. */
export class InvalidIdTokenError extends Error {}

const LINE_USER_ID = /^U[0-9a-f]{32}$/;

/**
 * Checks a LIFF ID token with LINE. LINE verifies the signature, expiry and
 * that it was issued for our LINE Login channel (client_id). Any other failure
 * (LINE unreachable, channel id not configured) throws a plain Error so the
 * caller answers 5xx instead of telling a real user their login is bad.
 */
export async function verifyIdToken(idToken: unknown): Promise<LineIdentity> {
  const channelId = (process.env.LINE_LOGIN_CHANNEL_ID || "").trim();
  if (!channelId) throw new Error("LINE_LOGIN_CHANNEL_ID is not configured");
  if (typeof idToken !== "string" || !idToken || idToken.length > 4096) {
    throw new InvalidIdTokenError("missing id token");
  }

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => null);
  if (res.status >= 500) throw new Error(`LINE verify unavailable (${res.status})`);
  if (!res.ok || typeof data?.sub !== "string" || !LINE_USER_ID.test(data.sub)) {
    throw new InvalidIdTokenError(data?.error_description || `LINE rejected the id token (${res.status})`);
  }

  return {
    sub: data.sub,
    name: typeof data.name === "string" ? data.name : null,
    picture: typeof data.picture === "string" ? data.picture : null,
  };
}

export function isLineUserId(value: unknown): value is string {
  return typeof value === "string" && LINE_USER_ID.test(value);
}
