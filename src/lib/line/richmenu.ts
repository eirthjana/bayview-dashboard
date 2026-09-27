import "server-only";

// Per-user rich menus (Messaging API). A user-level link overrides the default
// menu, so unlinking drops the user back to the small "not verified" menu.

async function lineBot(path: string, method: "POST" | "DELETE"): Promise<void> {
  const token = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
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
  if (!richMenuId) throw new Error("RICHMENU_ID_LINKED is not configured");
  await linkRichMenu(userId, richMenuId);
}
