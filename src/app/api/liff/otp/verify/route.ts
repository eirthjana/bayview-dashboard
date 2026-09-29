import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPLOYEE_TABLE } from "@/lib/config";
import { linkVerifiedMenu } from "@/lib/line/richmenu";
import { readLiffRequest, serverError } from "@/lib/liff/request";
import { verifyOtpCode } from "@/lib/liff/registration";

/** Step 2 of LIFF registration: check the emailed code and link the LINE account. */
export async function POST(request: NextRequest) {
  const auth = await readLiffRequest(request);
  if (!auth.ok) return auth.response;

  const code = typeof auth.body.code === "string" ? auth.body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ status: "bad_request", error: "กรุณากรอกรหัส 6 หลัก" }, { status: 400 });
  }

  try {
    const result = await verifyOtpCode(createAdminClient(), EMPLOYEE_TABLE, auth.identity, code);

    if (result.status === "retry") {
      return NextResponse.json(
        { status: "retry", error: "มีการยืนยันซ้อนกัน กรุณากดยืนยันอีกครั้ง" },
        { status: 409 }
      );
    }
    if (result.status !== "linked") return NextResponse.json(result);

    // The account is linked either way; if LINE refuses the menu switch an
    // admin can re-link it from the dashboard.
    try {
      await linkVerifiedMenu(auth.identity.sub);
    } catch (error) {
      console.error(`Rich menu link failed for emp ${result.employee.emp_id}:`, error);
    }

    const { name, name_th, department, position } = result.employee;
    return NextResponse.json({ status: "linked", name, name_th, department, position });
  } catch (error) {
    return serverError("OTP verify failed", error);
  }
}
