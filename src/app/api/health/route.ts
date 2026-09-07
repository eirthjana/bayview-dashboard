import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
const PROBE_TIMEOUT_MS = 4000;
// Several open tabs poll this route independently. Reusing a very recent probe
// keeps the number of round trips through the ngrok tunnel tied to wall-clock
// time rather than to how many dashboards happen to be open.
const PROBE_CACHE_MS = 3000;

type Check = "up" | "down" | "unknown";

type N8nResult = { status: Check; reason: string };

let cachedN8n: { at: number; result: N8nResult } | null = null;

/**
 * Liveness probe for n8n behind the ngrok tunnel.
 *
 * A plain "did it answer with any HTTP status" test is not enough here: when the
 * tunnel itself is offline ngrok answers 404 too — the same status n8n returns
 * for an unregistered webhook path — so an offline bot would read as healthy.
 * The two are told apart by who actually answered:
 *   - ngrok sets an `ngrok-error-code` header on its own error pages
 *   - n8n answers this path as application/json
 * Both signals live in the headers, so HEAD is enough and no body crosses the
 * tunnel — which is what makes it affordable to probe every few seconds.
 */
async function probeN8n(): Promise<N8nResult> {
  if (!N8N_WEBHOOK_URL) return { status: "unknown", reason: "ยังไม่ได้ตั้งค่า N8N_WEBHOOK_URL" };

  let res: Response;
  try {
    res = await fetch(`${N8N_WEBHOOK_URL}/__health_probe__`, {
      method: "HEAD",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return { status: "down", reason: "ต่อไม่ติด / หมดเวลารอ" };
  }

  if (res.headers.get("ngrok-error-code")) {
    return { status: "down", reason: "ngrok tunnel ออฟไลน์" };
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return { status: "down", reason: `n8n ไม่ตอบหลัง tunnel (${res.status})` };
  }
  if (!(res.headers.get("content-type") || "").includes("application/json")) {
    return { status: "down", reason: `ตอบกลับไม่ใช่ n8n (${res.status})` };
  }

  return { status: "up", reason: `n8n ตอบกลับ (${res.status})` };
}

async function checkN8n(): Promise<N8nResult> {
  if (cachedN8n && Date.now() - cachedN8n.at < PROBE_CACHE_MS) return cachedN8n.result;
  const result = await probeN8n();
  cachedN8n = { at: Date.now(), result };
  return result;
}

async function readAiEnabled(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value")
    .eq("key", "ai_enabled")
    .maybeSingle();

  if (error) return { ok: false as const, aiEnabled: null };

  // ai_enabled is a jsonb column, so it arrives as a real boolean or as "true"
  const raw = data?.value;
  const aiEnabled =
    typeof raw === "boolean" ? raw : typeof raw === "string" ? raw.trim().toLowerCase() === "true" : null;

  return { ok: true as const, aiEnabled };
}

export async function GET() {
  const [n8n, dbProbe] = await Promise.all([
    checkN8n(),
    (async () => {
      try {
        const supabase = await createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        // An unreachable Supabase surfaces here first, before the session check.
        // Report it as the database being out rather than as "not signed in",
        // otherwise a real outage shows up in the badge as an auth problem.
        if (authError && !user) {
          const status = (authError as { status?: number }).status;
          if (status === undefined || status >= 500) {
            return { reachable: false as const, authed: false as const, aiEnabled: null };
          }
        }
        if (!user) return { reachable: true as const, authed: false as const, aiEnabled: null };

        const settings = await readAiEnabled(supabase);
        return {
          reachable: settings.ok,
          authed: true as const,
          aiEnabled: settings.aiEnabled,
        };
      } catch {
        return { reachable: false as const, authed: false as const, aiEnabled: null };
      }
    })(),
  ]);

  if (dbProbe.reachable && !dbProbe.authed) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const database: Check = dbProbe.reachable ? "up" : "down";
  const down = database === "down" || n8n.status === "down";
  const degraded = down || dbProbe.aiEnabled === false || n8n.status === "unknown";

  return NextResponse.json({
    success: true,
    overall: down ? "down" : degraded ? "degraded" : "up",
    database,
    n8n: n8n.status,
    n8nReason: n8n.reason,
    aiEnabled: dbProbe.aiEnabled,
    checkedAt: new Date().toISOString(),
  });
}
