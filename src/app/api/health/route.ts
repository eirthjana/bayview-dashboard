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

type ProbeResult = { ngrok: Check; n8n: Check; reason: string };

let cachedProbe: { at: number; result: ProbeResult } | null = null;

function getN8nBaseUrl(): string {
  const raw = (process.env.N8N_WEBHOOK_URL || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

/**
 * One request tells us about two hops: the ngrok tunnel, and n8n behind it.
 * Probes the standard `/healthz` endpoint on n8n base URL.
 *
 * Distinguishes tunnel status vs n8n status:
 *   - ngrok sets an `ngrok-error-code` header on its own error pages when offline
 *   - 502/503/504 indicates tunnel is up but n8n service behind it is unreachable
 *   - HTTP 200 on /healthz: n8n is fully healthy and answering
 *   - HTTP 200-404: Tunnel is active and connected to n8n (ready for webhooks)
 */
async function probe(): Promise<ProbeResult> {
  const baseUrl = getN8nBaseUrl();
  if (!baseUrl) {
    return { ngrok: "unknown", n8n: "unknown", reason: "ยังไม่ได้ตั้งค่า N8N_WEBHOOK_URL" };
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/healthz`, {
      method: "GET",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return { ngrok: "down", n8n: "unknown", reason: "ต่อ tunnel ไม่ติด / หมดเวลารอ" };
  }

  if (res.headers.get("ngrok-error-code")) {
    return { ngrok: "down", n8n: "unknown", reason: "ngrok tunnel ออฟไลน์" };
  }

  // Past this point the tunnel answered, so anything wrong is behind it.
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return { ngrok: "up", n8n: "down", reason: `n8n ไม่ตอบหลัง tunnel (${res.status})` };
  }

  // HTTP 200: n8n standard /healthz endpoint answered OK
  if (res.status === 200) {
    return { ngrok: "up", n8n: "up", reason: "อุโมงค์เชื่อมต่อและ n8n ตอบรับพร้อมใช้งาน" };
  }

  // HTTP 200-404: Tunnel answered without ngrok errors (ready for webhooks)
  if (res.status >= 200 && res.status <= 404) {
    return { ngrok: "up", n8n: "up", reason: "อุโมงค์เชื่อมต่อสำเร็จ (พร้อมรับ Webhook)" };
  }

  return { ngrok: "up", n8n: "up", reason: "อุโมงค์เชื่อมต่อสำเร็จ (พร้อมรับ Webhook)" };
}

async function checkTunnelAndN8n(): Promise<ProbeResult> {
  if (cachedProbe && Date.now() - cachedProbe.at < PROBE_CACHE_MS) return cachedProbe.result;
  const result = await probe();
  cachedProbe = { at: Date.now(), result };
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
  const [tunnel, dbProbe] = await Promise.all([
    checkTunnelAndN8n(),
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
  const down = database === "down" || tunnel.ngrok !== "up" || tunnel.n8n !== "up";
  const degraded = down || dbProbe.aiEnabled === false;

  return NextResponse.json({
    success: true,
    overall: down ? "down" : degraded ? "degraded" : "up",
    database,
    ngrok: tunnel.ngrok,
    n8n: tunnel.n8n,
    probeReason: tunnel.reason,
    aiEnabled: dbProbe.aiEnabled,
    checkedAt: new Date().toISOString(),
  });
}
