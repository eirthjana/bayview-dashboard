import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { InvalidIdTokenError, verifyIdToken, type LineIdentity } from "@/lib/line/verify-id-token";

type LiffRequest =
  | { ok: true; body: Record<string, unknown>; identity: LineIdentity }
  | { ok: false; response: NextResponse };

/**
 * First step of every /api/liff route: parse the JSON body and verify its
 * idToken with LINE. Who the caller is comes only from the verified token;
 * any userId-like field in the body is ignored.
 */
export async function readLiffRequest(request: NextRequest): Promise<LiffRequest> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, response: NextResponse.json({ status: "bad_request" }, { status: 400 }) };
  }

  try {
    const identity = await verifyIdToken((body as Record<string, unknown>).idToken);
    return { ok: true, body: body as Record<string, unknown>, identity };
  } catch (error) {
    if (error instanceof InvalidIdTokenError) {
      return { ok: false, response: NextResponse.json({ status: "unauthorized" }, { status: 401 }) };
    }
    console.error("LIFF id token check failed:", error);
    return {
      ok: false,
      response: NextResponse.json(
        { status: "error", error: "ตรวจสอบบัญชี LINE ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
        { status: 503 }
      ),
    };
  }
}

/** An employee id as typed: 1–9 digits, above zero. */
export function parseEmpId(value: unknown): number | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,9}$/.test(text)) return null;
  const empId = Number(text);
  return empId > 0 ? empId : null;
}

export function serverError(context: string, error: unknown): NextResponse {
  console.error(`${context}:`, error);
  return NextResponse.json({ status: "error", error: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
}
