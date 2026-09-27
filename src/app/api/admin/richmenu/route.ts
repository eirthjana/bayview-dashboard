import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { isLineUserId } from "@/lib/line/verify-id-token";
import { linkVerifiedMenu, unlinkRichMenu } from "@/lib/line/richmenu";

/**
 * Dashboard-only: give an employee the full menu ("link") or send them back to
 * the default small one ("unlink"), e.g. after an admin unlinks or disables
 * them. Same admin check as the other admin APIs (admin_users + 2FA).
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => null);
  const lineUserId = body?.lineUserId;
  const action = body?.action;
  if (!isLineUserId(lineUserId) || (action !== "link" && action !== "unlink")) {
    return NextResponse.json(
      { success: false, error: "ต้องระบุ lineUserId (U + 32 ตัว) และ action เป็น link หรือ unlink" },
      { status: 400 }
    );
  }

  try {
    if (action === "link") await linkVerifiedMenu(lineUserId);
    else await unlinkRichMenu(lineUserId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Rich menu ${action} failed:`, error);
    const message = error instanceof Error ? error.message : "LINE API error";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
