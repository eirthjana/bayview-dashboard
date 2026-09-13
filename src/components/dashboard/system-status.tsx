"use client";

import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SYSTEM_HEALTH_REFRESH } from "@/lib/system-health-events";

interface Health {
  overall: "up" | "degraded" | "down";
  database: "up" | "down" | "unknown";
  ngrok: "up" | "down" | "unknown";
  n8n: "up" | "down" | "unknown";
  probeReason: string;
  aiEnabled: boolean | null;
  checkedAt: string;
}

// Nothing upstream can notify us that ngrok or Supabase just died, so how fast
// an outage shows up is exactly this interval. It is kept short enough to read
// as immediate, and paid for by skipping the probe entirely while the tab is in
// the background — polling only runs while somebody is actually looking at it.
const POLL_MS = 5_000;

const TONE = {
  up: {
    box: "bg-emerald-500/10 border-emerald-500/20",
    dot: "bg-emerald-500 animate-pulse",
    text: "text-emerald-400",
  },
  degraded: {
    box: "bg-amber-500/10 border-amber-500/20",
    dot: "bg-amber-500 animate-pulse",
    text: "text-amber-400",
  },
  down: {
    box: "bg-rose-500/10 border-rose-500/20",
    dot: "bg-rose-500 animate-pulse",
    text: "text-rose-400",
  },
  checking: {
    box: "bg-zinc-500/10 border-zinc-500/20",
    dot: "bg-zinc-400",
    text: "text-zinc-500 dark:text-zinc-400",
  },
} as const;

function label(h: Health): string {
  if (h.database === "down") return "Database ขัดข้อง";
  // ngrok first: when the tunnel is out n8n reads "unknown" only because there
  // is no route to reach it, and naming the tunnel points at the actual fix
  if (h.ngrok !== "up") return "Ngrok ขัดข้อง";
  if (h.n8n !== "up") return "n8n ขัดข้อง";
  if (h.aiEnabled === false) return "AI ปิดใช้งาน";
  return "System Online";
}

// Each row is online or it is not. Anything short of a confirmed "up" — a probe
// that timed out, an unset webhook URL, an unreadable flag — counts as offline,
// because a status nobody can confirm is not something to show as healthy.
function rowsFor(h: Health) {
  return [
    { label: "Database", online: h.database === "up" },
    { label: "Ngrok", online: h.ngrok === "up" },
    { label: "n8n", online: h.n8n === "up" },
    { label: "AI ตอบอัตโนมัติ", online: h.aiEnabled === true },
  ];
}

export function SystemStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function probe() {
      try {
        // the browser already knows this machine has no network — say so at once
        // instead of waiting out a fetch that cannot succeed
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          if (alive) setFailed(true);
          return;
        }
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (data.success) {
          setHealth(data);
          setFailed(false);
        } else {
          setFailed(true);
        }
      } catch {
        // the dashboard itself could not be reached — that is a real outage too
        if (alive) setFailed(true);
      }
    }

    // a background tab has nobody reading the badge; skip the round trip and
    // catch up the moment it comes back to the foreground
    function tick() {
      if (document.visibilityState === "visible") probe();
    }

    probe();
    const id = setInterval(tick, POLL_MS);
    window.addEventListener(SYSTEM_HEALTH_REFRESH, probe);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    window.addEventListener("online", probe);
    window.addEventListener("offline", probe);

    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener(SYSTEM_HEALTH_REFRESH, probe);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      window.removeEventListener("online", probe);
      window.removeEventListener("offline", probe);
    };
  }, []);

  const tone = failed
    ? TONE.down
    : health
      ? TONE[health.overall]
      : TONE.checking;

  const text = failed ? "เชื่อมต่อไม่ได้" : health ? label(health) : "กำลังตรวจสอบ...";

  const rows = health ? rowsFor(health) : [];

  const badge = (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-default ${tone.box}`}>
      <div className={`w-2 h-2 rounded-full ${tone.dot}`} />
      <span className={`text-xs font-medium ${tone.text}`}>{text}</span>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={badge} />
      <TooltipContent
        side="bottom"
        className="bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700"
      >
        {health ? (
          <div className="space-y-1 min-w-[13rem]">
            {rows.map((r) => (
              <p key={r.label} className="flex items-center justify-between gap-6">
                <span>{r.label}</span>
                <span
                  className={`font-semibold ${
                    r.online ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {r.online ? "ออนไลน์" : "ออฟไลน์"}
                </span>
              </p>
            ))}
            <p className="pt-1 text-zinc-500 dark:text-zinc-400">
              ตรวจล่าสุด {new Date(health.checkedAt).toLocaleTimeString("th-TH")}
            </p>
          </div>
        ) : (
          <p>ยังไม่ได้ผลตรวจ</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
