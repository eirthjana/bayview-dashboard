import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPLOYEE_TABLE } from "@/lib/config";
import { readLiffRequest, serverError } from "@/lib/liff/request";
import { normalizePhone, PROFILE_COLUMNS } from "@/lib/liff/registration";

/** The caller's own employee profile ("my profile"), found by their verified LINE account. */
export async function POST(request: NextRequest) {
  const auth = await readLiffRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await createAdminClient()
      .from(EMPLOYEE_TABLE)
      .select(PROFILE_COLUMNS)
      .eq("line_user_id", auth.identity.sub)
      .eq("status", "linked")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ status: "not_linked" }, { status: 404 });
    return NextResponse.json({ status: "ok", profile: data });
  } catch (error) {
    return serverError("LIFF profile read failed", error);
  }
}

/**
 * Employees may change only their phone number. Department, position and
 * access level decide what the bot lets them see, so those stay with HR.
 */
export async function PATCH(request: NextRequest) {
  const auth = await readLiffRequest(request);
  if (!auth.ok) return auth.response;

  const phone = normalizePhone(auth.body.phone_number);
  if (!phone) {
    return NextResponse.json(
      { status: "bad_request", error: "เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await createAdminClient()
      .from(EMPLOYEE_TABLE)
      .update({ phone_number: phone })
      .eq("line_user_id", auth.identity.sub)
      .eq("status", "linked")
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ status: "not_linked" }, { status: 404 });
    return NextResponse.json({ status: "ok", profile: data });
  } catch (error) {
    return serverError("LIFF phone update failed", error);
  }
}
