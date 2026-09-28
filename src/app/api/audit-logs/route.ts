import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getAdminAuditLogs, logAdminActivity } from "@/lib/admin-audit";

export async function GET() {
  try {
    const check = await requireAdminApi();
    if (!check.ok) return check.response;

    const logs = await getAdminAuditLogs();
    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching audit logs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await requireAdminApi();
    if (!check.ok) return check.response;

    const body = await request.json();
    const { action_type, target, details, status } = body;

    if (!action_type) {
      return NextResponse.json({ success: false, error: "action_type is required" }, { status: 400 });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : request.headers.get("x-real-ip") || "127.0.0.1";

    await logAdminActivity({
      action_type,
      target,
      details,
      status: status || "success",
      ip_address: ip,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error recording audit log";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
