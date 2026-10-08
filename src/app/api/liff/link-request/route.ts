import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPLOYEE_TABLE } from "@/lib/config";
import { parseEmpId, readLiffRequest, serverError } from "@/lib/liff/request";
import { cancelOwnLinkRequest, createLinkRequest, getOwnLinkRequest } from "@/lib/liff/link-requests";

/**
 * "Ask an admin to verify me", for employees who can't get the email OTP.
 * action "status" reads the caller's open (or recently rejected) request,
 * "create" opens one for empId, "cancel" withdraws the open one.
 */
export async function POST(request: NextRequest) {
  const auth = await readLiffRequest(request);
  if (!auth.ok) return auth.response;

  const db = createAdminClient();
  const action = auth.body.action;

  try {
    if (action === "status") {
      return NextResponse.json({ status: "ok", request: await getOwnLinkRequest(db, auth.identity.sub) });
    }

    if (action === "cancel") {
      await cancelOwnLinkRequest(db, auth.identity.sub);
      return NextResponse.json({ status: "ok", request: null });
    }

    if (action === "create") {
      const empId = parseEmpId(auth.body.empId);
      if (empId === null) {
        return NextResponse.json(
          { status: "bad_request", error: "กรุณากรอกรหัสพนักงานเป็นตัวเลข" },
          { status: 400 }
        );
      }
      const result = await createLinkRequest(db, EMPLOYEE_TABLE, auth.identity, empId);
      if (result.status === "rate_limited") {
        return NextResponse.json(
          { status: "rate_limited", error: "ส่งคำขอบ่อยเกินไป กรุณารอประมาณ 1 ชั่วโมงแล้วลองใหม่ หรือติดต่อแอดมินโดยตรง" },
          { status: 429 }
        );
      }
      if (result.status === "already_linked") return NextResponse.json({ status: "already_linked" });
      return NextResponse.json({ status: "ok", request: result.request });
    }

    return NextResponse.json({ status: "bad_request" }, { status: 400 });
  } catch (error) {
    return serverError(`Link request ${String(action)} failed`, error);
  }
}
