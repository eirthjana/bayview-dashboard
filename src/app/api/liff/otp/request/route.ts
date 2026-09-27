import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPLOYEE_TABLE } from "@/lib/config";
import { sendMail } from "@/lib/mailer";
import { readLiffRequest, serverError } from "@/lib/liff/request";
import { OTP_REQUEST_MESSAGE, requestOtp } from "@/lib/liff/registration";
import { otpEmailMessage } from "@/lib/liff/otp-email";

function parseEmpId(value: unknown): number | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,9}$/.test(text)) return null;
  const empId = Number(text);
  return empId > 0 ? empId : null;
}

/**
 * Step 1 of LIFF registration: email a one-time code to the employee. Apart
 * from rate limits and "you're already linked" (about the caller's own LINE
 * account), the answer is word-for-word the same whether or not the employee
 * id exists, so the page can't be used to discover valid ids.
 */
export async function POST(request: NextRequest) {
  const auth = await readLiffRequest(request);
  if (!auth.ok) return auth.response;

  const empId = parseEmpId(auth.body.empId);
  if (empId === null) {
    return NextResponse.json(
      { status: "bad_request", error: "กรุณากรอกรหัสพนักงานเป็นตัวเลข" },
      { status: 400 }
    );
  }

  try {
    const result = await requestOtp(createAdminClient(), EMPLOYEE_TABLE, auth.identity.sub, empId);

    if (result.status === "already_linked") {
      return NextResponse.json({ status: "already_linked" });
    }
    if (result.status === "rate_limited") {
      return NextResponse.json(
        {
          status: "rate_limited",
          retryAfter: result.retryAfter,
          error: `ขอรหัสบ่อยเกินไป กรุณารอ ${result.retryAfter} วินาทีแล้วลองใหม่`,
        },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
      );
    }

    // Sent after the response so a real employee id doesn't answer slower
    // than a made-up one.
    const email = result.email;
    if (email) {
      after(async () => {
        try {
          await sendMail(otpEmailMessage(email));
        } catch (error) {
          console.error("OTP email failed:", error);
        }
      });
    }
    return NextResponse.json({ status: "requested", message: OTP_REQUEST_MESSAGE });
  } catch (error) {
    return serverError("OTP request failed", error);
  }
}
