import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireMfa } from "@/lib/require-mfa";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type AdminCheck =
  | { ok: true; supabase: ServerClient; user: User }
  | { ok: false; response: NextResponse };

/** For admin-only API routes: logged in, listed in admin_users, and past 2FA. */
export async function requireAdminApi(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminUser) {
    return { ok: false, response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }

  const mfaBlocked = await requireMfa(supabase);
  if (mfaBlocked) return { ok: false, response: mfaBlocked };

  return { ok: true, supabase, user };
}
