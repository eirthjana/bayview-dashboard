import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPLOYEE_TABLE } from "@/lib/config";
import { sendMail } from "@/lib/mailer";
import { parseEmpId, readLiffRequest, serverError } from "@/lib/liff/request";
import { OTP_REQUEST_MESSAGE, otpSentMessage, requestOtp } from "@/lib/liff/registration";
import { otpEmailMessage } from "@/lib/liff/otp-email";

/**
 * Step 1 of LIFF registration: email a one-time code to the employee. When a
 * code was sent, the answer names the address masked (tt***@domain) so the
 * employee knows which inbox to check. Every case where nothing was sent
 * shares one neutral answer. Rate limits (per LINE account and per employee)
 * keep anyone from walking through employee ids this way.
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
    return NextResponse.json({
      status: "requested",
      message: email ? otpSentMessage(email.to) : OTP_REQUEST_MESSAGE,
    });
  } catch (error) {
    return serverError("OTP request failed", error);
  }
}
