import { NextResponse } from "next/server";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * The middleware sends a password-only (aal1) session to /mfa before any
 * dashboard page, but it does not run on /api. Admin API routes call this
 * after their admin check so a session that skipped 2FA cannot use them
 * directly. Returns a 403 response to send back, or null when the session is
 * fully verified.
 */
export async function requireMfa(supabase: ServerClient): Promise<NextResponse | null> {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") return null;
  return NextResponse.json(
    { success: false, error: "ต้องยืนยันตัวตน 2 ขั้นตอน (2FA) ก่อนใช้งาน" },
    { status: 403 }
  );
}
