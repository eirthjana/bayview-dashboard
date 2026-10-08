import "server-only";
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmployeeTable } from "@/lib/config";
import type { LineIdentity } from "@/lib/line/verify-id-token";
import { CLEARED_PENDING, type LinkedEmployee } from "@/lib/liff/registration";

// The fallback for employees with no email that can receive the OTP: they ask
// an admin to verify them in person (staff card + the 4-digit ref code on
// their phone), and the admin approves from Employees Management. Rows live
// in link_requests (migration 19); only the service role writes there.

const HOURLY_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;
/** A rejection is shown to the employee for this long, then forgotten. */
const REJECTION_SHOWN_MS = 7 * 24 * HOUR_MS;

export type OwnLinkRequest = {
  status: "pending" | "rejected";
  ref_code: string;
  emp_id: number;
  created_at: string;
  note: string | null;
};

const OWN_COLUMNS = "status, ref_code, emp_id, created_at, note";

/** The caller's open request, or their latest recent rejection, or null. */
export async function getOwnLinkRequest(db: SupabaseClient, sub: string): Promise<OwnLinkRequest | null> {
  const { data, error } = await db
    .from("link_requests")
    .select(OWN_COLUMNS)
    .eq("line_user_id", sub)
    .in("status", ["pending", "rejected"])
    .gte("created_at", new Date(Date.now() - REJECTION_SHOWN_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as OwnLinkRequest | undefined) ?? null;
}

export type CreateLinkRequestResult =
  | { status: "pending"; request: OwnLinkRequest }
  | { status: "already_linked" }
  | { status: "rate_limited" };

/**
 * Opens a request for empId, replacing the caller's earlier open one. Whether
 * empId exists is not checked here, so the answer can't be used to look up
 * employee ids; the admin sees an unknown id on the dashboard instead.
 */
export async function createLinkRequest(
  db: SupabaseClient,
  table: EmployeeTable,
  identity: LineIdentity,
  empId: number
): Promise<CreateLinkRequestResult> {
  const { sub, name, picture } = identity;

  const { data: own, error: ownError } = await db
    .from(table)
    .select("status")
    .eq("line_user_id", sub)
    .maybeSingle();
  if (ownError) throw ownError;
  if (own?.status === "linked") return { status: "already_linked" };

  const { count, error: countError } = await db
    .from("link_requests")
    .select("id", { count: "exact", head: true })
    .eq("line_user_id", sub)
    .gte("created_at", new Date(Date.now() - HOUR_MS).toISOString());
  if (countError) throw countError;
  if ((count ?? 0) >= HOURLY_LIMIT) return { status: "rate_limited" };

  const { error: cancelError } = await db
    .from("link_requests")
    .update({ status: "cancelled", decided_at: new Date().toISOString(), note: "ส่งคำขอใหม่แทน" })
    .eq("line_user_id", sub)
    .eq("status", "pending");
  if (cancelError) throw cancelError;

  const { data, error } = await db
    .from("link_requests")
    .insert({
      ref_code: randomInt(0, 10_000).toString().padStart(4, "0"),
      employee_table: table,
      emp_id: empId,
      line_user_id: sub,
      line_name: name,
      line_picture_url: picture,
    })
    .select(OWN_COLUMNS)
    .single();
  if (error) {
    // Two submits raced past the cancel above; the other one's request stands.
    if (error.code === "23505") {
      const existing = await getOwnLinkRequest(db, sub);
      if (existing?.status === "pending") return { status: "pending", request: existing };
    }
    throw error;
  }
  return { status: "pending", request: data as OwnLinkRequest };
}

export async function cancelOwnLinkRequest(db: SupabaseClient, sub: string): Promise<void> {
  const { error } = await db
    .from("link_requests")
    .update({ status: "cancelled", decided_at: new Date().toISOString(), note: "พนักงานยกเลิกเอง" })
    .eq("line_user_id", sub)
    .eq("status", "pending");
  if (error) throw error;
}

type PendingRow = {
  id: number;
  employee_table: string;
  emp_id: number;
  line_user_id: string;
  line_name: string | null;
  line_picture_url: string | null;
};

export type DecideResult =
  | { ok: true; employee?: LinkedEmployee; lineUserId?: string }
  | { ok: false; status: number; error: string };

async function loadPending(db: SupabaseClient, id: number): Promise<PendingRow | null> {
  const { data, error } = await db
    .from("link_requests")
    .select("id, employee_table, emp_id, line_user_id, line_name, line_picture_url")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw error;
  return data as PendingRow | null;
}

const ALREADY_DECIDED: DecideResult = {
  ok: false,
  status: 409,
  error: "คำขอนี้ถูกจัดการไปแล้ว หรือพนักงานยกเลิกไปแล้ว กรุณากดรีเฟรช",
};

/**
 * Links the requesting LINE account to the employee. The employee row is
 * updated only while it is still free and not disabled, the same guard the
 * OTP flow uses. Other open requests for the same employee are closed.
 */
export async function approveLinkRequest(
  db: SupabaseClient,
  table: EmployeeTable,
  id: number,
  adminEmail: string
): Promise<DecideResult> {
  const request = await loadPending(db, id);
  if (!request) return ALREADY_DECIDED;
  if (request.employee_table !== table) {
    return { ok: false, status: 409, error: `คำขอนี้เป็นของตาราง ${request.employee_table} ไม่ใช่ตารางที่ใช้อยู่` };
  }

  const { data: other, error: otherError } = await db
    .from(table)
    .select("emp_id")
    .eq("line_user_id", request.line_user_id)
    .maybeSingle();
  if (otherError) throw otherError;
  if (other) {
    return { ok: false, status: 409, error: `บัญชี LINE นี้ผูกกับรหัสพนักงาน ${other.emp_id} อยู่แล้ว` };
  }

  const { data: linked, error: linkError } = await db
    .from(table)
    .update({
      line_user_id: request.line_user_id,
      ...(request.line_name ? { line_name: request.line_name } : {}),
      line_picture_url: request.line_picture_url,
      status: "linked",
      ...CLEARED_PENDING,
      otp_attempts: 0,
    })
    .eq("emp_id", request.emp_id)
    .is("line_user_id", null)
    .neq("status", "disabled")
    .select("emp_id, name, name_th, department, position");
  if (linkError) {
    if (linkError.code === "23505") {
      return { ok: false, status: 409, error: "บัญชี LINE นี้ผูกกับพนักงานคนอื่นอยู่แล้ว" };
    }
    throw linkError;
  }
  if (!linked?.length) {
    const { data: employee, error } = await db
      .from(table)
      .select("status, line_user_id")
      .eq("emp_id", request.emp_id)
      .maybeSingle();
    if (error) throw error;
    const reason = !employee
      ? `ไม่พบรหัสพนักงาน ${request.emp_id} ในระบบ`
      : employee.status === "disabled"
        ? `รหัสพนักงาน ${request.emp_id} ถูกปิดใช้งานอยู่`
        : `รหัสพนักงาน ${request.emp_id} ผูก LINE บัญชีอื่นอยู่แล้ว ต้องยกเลิกการผูกเดิมก่อน`;
    return { ok: false, status: 409, error: reason };
  }

  const now = new Date().toISOString();
  const { error: doneError } = await db
    .from("link_requests")
    .update({ status: "approved", decided_at: now, decided_by: adminEmail })
    .eq("id", id);
  if (doneError) throw doneError;

  const { error: closeError } = await db
    .from("link_requests")
    .update({
      status: "rejected",
      decided_at: now,
      decided_by: adminEmail,
      note: "รหัสพนักงานนี้ได้รับการยืนยันกับบัญชี LINE อื่นแล้ว",
    })
    .eq("emp_id", request.emp_id)
    .eq("employee_table", table)
    .eq("status", "pending");
  if (closeError) throw closeError;

  return { ok: true, employee: linked[0] as LinkedEmployee, lineUserId: request.line_user_id };
}

export async function rejectLinkRequest(
  db: SupabaseClient,
  id: number,
  adminEmail: string,
  note: string | null
): Promise<DecideResult> {
  const { data, error } = await db
    .from("link_requests")
    .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: adminEmail, note })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  return data?.length ? { ok: true } : ALREADY_DECIDED;
}
