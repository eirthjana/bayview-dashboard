import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { logAdminActivity } from "@/lib/admin-audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPLOYEE_TABLE } from "@/lib/config";
import { linkVerifiedMenu } from "@/lib/line/richmenu";
import { approveLinkRequest, rejectLinkRequest } from "@/lib/liff/link-requests";

/**
 * Dashboard-only: approve or reject an employee's "verify me" request
 * (Employees Management > คำขอยืนยันตัวตน). Approving links the LINE account
 * and gives it the staff menu, like a successful email OTP.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  const action = body?.action;
  if (!Number.isSafeInteger(id) || id <= 0 || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ success: false, error: "ต้องระบุ id และ action เป็น approve หรือ reject" }, { status: 400 });
  }
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 300) : null;
  const adminEmail = admin.user.email || admin.user.id;
  const db = createAdminClient();

  try {
    if (action === "reject") {
      const result = await rejectLinkRequest(db, id, adminEmail, note);
      if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
      await logAdminActivity({
        action_type: "reject_link_request",
        target: `คำขอ #${id}`,
        details: `ปฏิเสธคำขอยืนยันตัวตนผ่านแอดมิน${note ? ` เหตุผล: ${note}` : ""}`,
      });
      return NextResponse.json({ success: true });
    }

    const result = await approveLinkRequest(db, EMPLOYEE_TABLE, id, adminEmail);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });

    const employee = result.employee!;
    let menuWarning: string | null = null;
    try {
      await linkVerifiedMenu(result.lineUserId!);
    } catch (error) {
      console.error(`Rich menu link failed for emp ${employee.emp_id}:`, error);
      menuWarning = error instanceof Error ? error.message : "LINE API error";
    }

    await logAdminActivity({
      action_type: "approve_link_request",
      target: `${employee.name_th || employee.name} (${employee.emp_id})`,
      details: `อนุมัติคำขอยืนยันตัวตนผ่านแอดมิน #${id} และผูกบัญชี LINE ให้แล้ว`,
    });
    return NextResponse.json({ success: true, employee, menuWarning });
  } catch (error) {
    console.error(`Link request ${action} failed:`, error);
    return NextResponse.json({ success: false, error: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
