import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmployeeTable } from "@/lib/config";
import type { LineIdentity } from "@/lib/line/verify-id-token";
import { generateOtp, hashOtp, verifyOtp, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from "@/lib/otp";

// Employee self-registration from the LIFF page: an OTP to the company email
// proves the person, the verified LINE ID token (sub) proves the LINE account.
// Every function here takes `sub` from a token already verified with LINE —
// never a userId sent by the client.

/** The same answer whether or not the employee id exists or can be linked. */
export const OTP_REQUEST_MESSAGE =
  "ถ้ารหัสพนักงานนี้อยู่ในระบบและยังไม่ได้ผูกบัญชี ระบบได้ส่งรหัส 6 หลักไปที่อีเมลบริษัทของคุณแล้ว หากไม่ได้รับภายใน 5 นาที กรุณาติดต่อฝ่าย HR";

const RESEND_SECONDS = 60;
const HOURLY_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;

const CLEARED_PENDING = {
  pending_otp_hash: null,
  pending_otp_code: null,
  pending_otp_expires_at: null,
  pending_line_user_id: null,
};

export type OtpEmail = { to: string; name: string; code: string };

export type RequestOtpResult =
  | { status: "requested"; email: OtpEmail | null }
  | { status: "already_linked" }
  | { status: "rate_limited"; retryAfter: number };

/**
 * Steps 2–7 of POST /api/liff/otp/request. Returns the email to send (after the
 * response) only when a code was saved; every other outcome that isn't a rate
 * limit looks the same to the caller.
 */
export async function requestOtp(
  db: SupabaseClient,
  table: EmployeeTable,
  sub: string,
  empId: number
): Promise<RequestOtpResult> {
  const { data: own, error: ownError } = await db
    .from(table)
    .select("emp_id, status")
    .eq("line_user_id", sub)
    .maybeSingle();
  if (ownError) throw ownError;
  if (own?.status === "linked") return { status: "already_linked" };

  // Per LINE account: one request a minute, five an hour.
  const now = Date.now();
  const hourAgo = new Date(now - HOUR_MS).toISOString();
  const { data: recent, error: recentError } = await db
    .from("otp_requests")
    .select("created_at")
    .eq("line_user_id", sub)
    .gte("created_at", hourAgo)
    .order("created_at", { ascending: false })
    .limit(HOURLY_LIMIT);
  if (recentError) throw recentError;
  if (recent.length > 0) {
    const sinceLast = now - Date.parse(recent[0].created_at);
    if (sinceLast < RESEND_SECONDS * 1000) {
      return { status: "rate_limited", retryAfter: Math.ceil((RESEND_SECONDS * 1000 - sinceLast) / 1000) };
    }
  }
  if (recent.length >= HOURLY_LIMIT) {
    const oldest = Date.parse(recent[HOURLY_LIMIT - 1].created_at);
    return { status: "rate_limited", retryAfter: Math.max(1, Math.ceil((oldest + HOUR_MS - now) / 1000)) };
  }

  // Logged before any eligibility check so failed guesses count too.
  const { error: logError } = await db.from("otp_requests").insert({ emp_id: empId, line_user_id: sub });
  if (logError) throw logError;

  // Per employee, across all LINE accounts: at most five emails an hour, so
  // nobody can flood a colleague's inbox. Counted after our own insert, so
  // requests racing each other can't all slip under the cap.
  const { count, error: countError } = await db
    .from("otp_requests")
    .select("id", { count: "exact", head: true })
    .eq("emp_id", empId)
    .gte("created_at", hourAgo);
  if (countError) throw countError;
  if ((count ?? 0) > HOURLY_LIMIT) return { status: "requested", email: null };

  // A LINE account already on a (disabled) row can't take another employee id.
  if (own) return { status: "requested", email: null };

  const { data: employee, error: employeeError } = await db
    .from(table)
    .select("emp_id, name, name_th, email, status, line_user_id")
    .eq("emp_id", empId)
    .maybeSingle();
  if (employeeError) throw employeeError;
  const email = employee?.email?.trim();
  if (!employee || employee.status === "disabled" || employee.line_user_id || !email) {
    return { status: "requested", email: null };
  }

  // One pending code per LINE account: a new request replaces any other.
  const { error: clearError } = await db
    .from(table)
    .update(CLEARED_PENDING)
    .eq("pending_line_user_id", sub)
    .neq("emp_id", empId);
  if (clearError) throw clearError;

  const code = generateOtp();
  const { data: saved, error: saveError } = await db
    .from(table)
    .update({
      pending_otp_hash: hashOtp(empId, code),
      pending_otp_code: null,
      pending_otp_expires_at: new Date(now + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
      pending_line_user_id: sub,
      otp_attempts: 0,
    })
    .eq("emp_id", empId)
    .is("line_user_id", null)
    .neq("status", "disabled")
    .select("emp_id");
  if (saveError) throw saveError;
  if (!saved?.length) return { status: "requested", email: null };

  return { status: "requested", email: { to: email, name: employee.name_th || employee.name, code } };
}

export type LinkedEmployee = {
  emp_id: number;
  name: string;
  name_th: string | null;
  department: string | null;
  position: string | null;
};

export type VerifyOtpResult =
  | { status: "linked"; employee: LinkedEmployee }
  | { status: "already_linked" }
  | { status: "no_pending" }
  | { status: "expired" }
  | { status: "locked" }
  | { status: "invalid"; attemptsLeft: number }
  | { status: "retry" };

/** Steps 2–6 of POST /api/liff/otp/verify. Linking the rich menu is left to the route. */
export async function verifyOtpCode(
  db: SupabaseClient,
  table: EmployeeTable,
  identity: LineIdentity,
  code: string
): Promise<VerifyOtpResult> {
  const { sub, name, picture } = identity;

  const { data: own, error: ownError } = await db
    .from(table)
    .select("emp_id, status")
    .eq("line_user_id", sub)
    .maybeSingle();
  if (ownError) throw ownError;
  if (own?.status === "linked") return { status: "already_linked" };

  const { data: rows, error: pendingError } = await db
    .from(table)
    .select("emp_id, pending_otp_hash, pending_otp_expires_at, otp_attempts")
    .eq("pending_line_user_id", sub)
    .order("pending_otp_expires_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (pendingError) throw pendingError;
  const row = rows?.[0];
  // No hash means the pending code came from the old chat flow; leave it be.
  if (!row?.pending_otp_hash || own) return { status: "no_pending" };

  const clearPending = async () => {
    const { error } = await db
      .from(table)
      .update(CLEARED_PENDING)
      .eq("emp_id", row.emp_id)
      .eq("pending_line_user_id", sub);
    if (error) throw error;
  };

  if (!row.pending_otp_expires_at || Date.parse(row.pending_otp_expires_at) <= Date.now()) {
    await clearPending();
    return { status: "expired" };
  }
  const attempts: number = row.otp_attempts ?? 0;
  if (attempts >= OTP_MAX_ATTEMPTS) {
    await clearPending();
    return { status: "locked" };
  }

  // Use up the attempt before looking at the code. The update only matches
  // while the counter (and the code) are still what we read, so parallel
  // guesses can't share one attempt.
  const { data: claimed, error: claimError } = await db
    .from(table)
    .update({ otp_attempts: attempts + 1 })
    .eq("emp_id", row.emp_id)
    .eq("pending_line_user_id", sub)
    .eq("pending_otp_hash", row.pending_otp_hash)
    .eq("otp_attempts", attempts)
    .select("emp_id");
  if (claimError) throw claimError;
  if (!claimed?.length) return { status: "retry" };

  if (!verifyOtp(row.emp_id, code, row.pending_otp_hash)) {
    const used = attempts + 1;
    if (used >= OTP_MAX_ATTEMPTS) {
      await clearPending();
      return { status: "locked" };
    }
    return { status: "invalid", attemptsLeft: OTP_MAX_ATTEMPTS - used };
  }

  // Only links a row that is still free and still waiting for this account,
  // so two people can't both win the same employee id.
  const { data: linked, error: linkError } = await db
    .from(table)
    .update({
      line_user_id: sub,
      ...(name ? { line_name: name } : {}),
      line_picture_url: picture,
      status: "linked",
      ...CLEARED_PENDING,
      otp_attempts: 0,
    })
    .eq("emp_id", row.emp_id)
    .is("line_user_id", null)
    .eq("pending_line_user_id", sub)
    .neq("status", "disabled")
    .select("emp_id, name, name_th, department, position");
  if (linkError) {
    // line_user_id is unique: this LINE account got linked elsewhere meanwhile.
    if (linkError.code === "23505") return { status: "already_linked" };
    throw linkError;
  }
  if (!linked?.length) return { status: "no_pending" };
  return { status: "linked", employee: linked[0] as LinkedEmployee };
}

export const PROFILE_COLUMNS =
  "emp_id, name, name_th, nickname, nickname_th, department, position, phone_number, line_picture_url, access_level";

/** Thai phone number as typed, spaces and dashes dropped: 0 followed by 8–9 digits. */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[\s-]/g, "");
  return /^0\d{8,9}$/.test(digits) ? digits : null;
}
