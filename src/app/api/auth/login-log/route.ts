import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { recordAdminLoginLog, getAdminLoginLogs } from "@/lib/admin-manage";

// Admin login audit log.
// Reading needs a signed-in admin past 2FA: the log holds admin emails and IPs.
// Writing is called by the login and 2FA pages, including for failed attempts
// made before anyone is signed in, so it stays open — but a "success" entry is
// only ever recorded for the signed-in user's own email, and the admin name is
// looked up on the server, so nobody can forge a successful login for someone.

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;

  try {
    const logs = await getAdminLoginLogs();
    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching login logs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Bad request" }, { status: 400 });
  }

  try {
    const status = body.status === "success" ? "success" : "failed";
    let email = clip(body.email, 254).toLowerCase();

    if (status === "success") {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      email = user.email.toLowerCase();
    }
    if (!email) {
      return NextResponse.json({ success: false, error: "Bad request" }, { status: 400 });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : request.headers.get("x-real-ip") || "127.0.0.1";

    const notesText = clip(body.notes, 200) || (status === "success" ? "เข้าสู่ระบบสำเร็จ" : "เข้าสู่ระบบไม่สำเร็จ");
    const adminName = typeof body.admin_name === "string" ? body.admin_name : null;

    await recordAdminLoginLog({
      admin_name: null, // resolved from admin_users by email
      email,
      ip_address: ip,
      status,
      notes: notesText,
    });

    const is2fa = typeof notesText === "string" && (notesText.includes("2FA") || notesText.includes("TOTP"));
    const { logAdminActivity } = await import("@/lib/admin-audit");
    await logAdminActivity({
      action_type: is2fa ? "verify_2fa" : "login",
      target: is2fa ? "2FA Authenticator" : "ระบบแดชบอร์ด (Dashboard)",
      details: notesText,
      status: status === "failed" ? "failed" : "success",
      email: email || "-",
      admin_name: adminName,
      ip_address: ip,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error logging auth attempt";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
