import { NextRequest, NextResponse } from "next/server";
import { recordAdminLoginLog, getAdminLoginLogs } from "@/lib/admin-manage";

export async function GET() {
  try {
    const logs = await getAdminLoginLogs();
    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching login logs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { admin_name, email, status, notes } = body;

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : request.headers.get("x-real-ip") || "127.0.0.1";

    await recordAdminLoginLog({
      admin_name: admin_name || (email ? email.split("@")[0] : "-"),
      email: email || "-",
      ip_address: ip,
      status: status === "failed" ? "failed" : "success",
      notes: notes || (status === "success" ? "เข้าสู่ระบบสำเร็จ" : "เข้าสู่ระบบไม่สำเร็จ"),
    });

    const is2fa = typeof notes === "string" && (notes.includes("2FA") || notes.includes("TOTP"));
    const { logAdminActivity } = await import("@/lib/admin-audit");
    await logAdminActivity({
      action_type: is2fa ? "verify_2fa" : "login",
      target: is2fa ? "2FA Authenticator" : "ระบบแดชบอร์ด (Dashboard)",
      details: notes || (status === "success" ? "เข้าสู่ระบบสำเร็จ" : "เข้าสู่ระบบไม่สำเร็จ"),
      status: status === "failed" ? "failed" : "success",
      email: email || "-",
      admin_name: admin_name || null,
      ip_address: ip,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error logging auth attempt";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
