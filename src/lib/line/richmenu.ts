import "server-only";

// Per-user rich menus (Messaging API). The default "not verified" menu is set
// in LINE Official Account Manager and must not be replaced through the API.
// A menu linked to one user shows instead of that default, so linking gives a
// verified employee the full menu and unlinking drops them back to the default.

/** A required env var is missing — a setup problem rather than a LINE error. */
export class RichMenuNotConfigured extends Error {}

async function lineBot(path: string, method: "POST" | "DELETE"): Promise<void> {
  const token = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
  if (!token) throw new RichMenuNotConfigured("LINE_CHANNEL_ACCESS_TOKEN");
  const res = await fetch(`https://api.line.me/v2/bot${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LINE ${method} ${path.split("/").slice(0, 3).join("/")} failed (${res.status}) ${detail.slice(0, 200)}`);
  }
}

export async function linkRichMenu(userId: string, richMenuId: string): Promise<void> {
  await lineBot(`/user/${encodeURIComponent(userId)}/richmenu/${encodeURIComponent(richMenuId)}`, "POST");
}

export async function unlinkRichMenu(userId: string): Promise<void> {
  await lineBot(`/user/${encodeURIComponent(userId)}/richmenu`, "DELETE");
}

/** Gives a verified employee the full menu. Needs RICHMENU_ID_LINKED (from scripts/richmenu/setup.mjs). */
export async function linkVerifiedMenu(userId: string): Promise<void> {
  const richMenuId = (process.env.RICHMENU_ID_LINKED || "").trim();
  if (!richMenuId) throw new RichMenuNotConfigured("RICHMENU_ID_LINKED");
  await linkRichMenu(userId, richMenuId);
}
