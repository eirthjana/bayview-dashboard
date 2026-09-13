import { createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "./analytics-client";
import type { AnalyticsSummary, HourlyUsage, DeptActivity } from "@/lib/types";

export const dynamic = "force-dynamic";

// Clean string by stripping quotes, equal signs, and whitespace — same helper
// used on the Overview page, kept local since it's not shared across pages.
function cleanId(id: string | null | undefined): string {
  if (!id) return "";
  return String(id)
    .replace(/^["'=]+/, "")
    .replace(/["'=]+$/, "")
    .replace(/=/g, "")
    .trim()
    .toLowerCase();
}

const BANGKOK_TZ = "Asia/Bangkok";

// chat_logs.created_at is a UTC timestamptz; the container it runs in isn't
// guaranteed to be in Bangkok time, so extract the hour explicitly via Intl
// rather than trusting Date#getHours().
function bangkokHour(iso: string): number {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TZ,
    hour: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date(iso))
    .find((p) => p.type === "hour")?.value;
  return hourPart ? parseInt(hourPart, 10) % 24 : 0;
}

interface ChatLogRow {
  user_message: string | null;
  tokens_used: number | null;
  created_at: string;
  line_user_id: string | null;
}

interface EmployeeDeptRow {
  line_user_id: string | null;
  department: string | null;
  name: string | null;
  name_th: string | null;
}

export default async function AnalyticsPage() {
  let summary: AnalyticsSummary = {
    totalInquiries: 0,
    avgTokensPerQuery: 0,
    peakTrafficTime: "-",
    mostActiveDept: "-",
  };
  let hourly: HourlyUsage[] = [];
  let deptActivity: DeptActivity[] = [];

  try {
    const supabase = await createClient();

    const [logsResult, employeesResult] = await Promise.all([
      // Failed requests are kept in Supabase but never surfaced in the
      // dashboard, so they are excluded here too — otherwise the inquiry
      // count and the per-hour/per-department charts would be inflated by
      // traffic the rest of the UI does not show.
      supabase
        .from("chat_logs")
        .select("user_message, tokens_used, created_at, line_user_id")
        .neq("status", "error"),
      supabase
        .from("employee_test")
        .select("line_user_id, department, name, name_th"),
    ]);

    const logs = (logsResult.data as ChatLogRow[]) || [];
    const employees = (employeesResult.data as EmployeeDeptRow[]) || [];

    const deptByLineId = new Map<string, string>();
    const nameByLineId = new Map<string, string>();
    employees.forEach((e) => {
      const key = cleanId(e.line_user_id);
      if (!key) return;
      if (e.department) deptByLineId.set(key, e.department);
      // Registered full name only — line_name is whatever the person set as
      // their LINE display name ("❅ Jedi ツ ❅"), which is not an identity.
      const name = e.name?.trim() || e.name_th?.trim();
      if (name) nameByLineId.set(key, name);
    });

    const total = logs.length;
    const totalTokens = logs.reduce((sum, l) => sum + (l.tokens_used || 0), 0);

    // Hour-of-day histogram across all history (not per-calendar-day) — a
    // "typical daily pattern" view, tiered by share of the busiest hour.
    const hourCounts = new Array(24).fill(0);
    logs.forEach((l) => {
      hourCounts[bangkokHour(l.created_at)] += 1;
    });
    const maxHour = Math.max(...hourCounts);
    const peakIdx = hourCounts.indexOf(maxHour);

    hourly = hourCounts.map((count, h) => {
      let tier: HourlyUsage["tier"] = "regular";
      if (maxHour > 0) {
        if (count === maxHour) tier = "peak";
        else if (count >= maxHour * 0.7) tier = "high";
      }
      return { hour: `${String(h).padStart(2, "0")}:00`, count, tier };
    });

    const peakTrafficTime =
      maxHour > 0
        ? `${String(peakIdx).padStart(2, "0")}:00 - ${String((peakIdx + 1) % 24).padStart(2, "0")}:00 น.`
        : "-";

    // Department activity: join each message's asker to employee_test via
    // line_user_id; anyone unmatched (guests, unlinked accounts) buckets
    // into "Guest / Unregistered" rather than being dropped from the chart.
    // Counted per department and, within each, per person — so the chart can be
    // opened up to show who the messages actually came from. Only a registered
    // full name is ever shown as a name; someone with no employee record falls
    // back to a shortened LINE id, which still tells two of them apart without
    // passing off a self-chosen LINE display name as an identity.
    const deptCounts = new Map<string, number>();
    const usersByDept = new Map<string, Map<string, { name: string; count: number }>>();

    logs.forEach((l) => {
      const key = cleanId(l.line_user_id);
      const dept = deptByLineId.get(key) || "Guest / Unregistered";
      deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);

      const rawId = String(l.line_user_id || "").replace(/^["'=]+|["'=]+$/g, "").trim();
      const name =
        nameByLineId.get(key) ||
        (rawId ? `ไม่ระบุตัวตน (${rawId.slice(0, 8)}…${rawId.slice(-4)})` : "ไม่ระบุตัวตน");

      if (!usersByDept.has(dept)) usersByDept.set(dept, new Map());
      const bucket = usersByDept.get(dept)!;
      const seen = bucket.get(key);
      if (seen) seen.count += 1;
      else bucket.set(key, { name, count: 1 });
    });

    deptActivity = Array.from(deptCounts.entries()).map(([department, count]) => ({
      department,
      count,
      users: Array.from(usersByDept.get(department)?.entries() || [])
        .map(([lineUserId, u]) => ({ lineUserId, name: u.name, count: u.count }))
        .sort((a, b) => b.count - a.count),
    }));
    const mostActiveDept =
      deptActivity.length > 0
        ? [...deptActivity].sort((a, b) => b.count - a.count)[0].department
        : "-";

    summary = {
      totalInquiries: total,
      avgTokensPerQuery: total > 0 ? Math.round(totalTokens / total) : 0,
      peakTrafficTime,
      mostActiveDept,
    };
  } catch (error) {
    console.error("Failed to fetch analytics data from Supabase:", error);
  }

  return <AnalyticsClient summary={summary} hourly={hourly} deptActivity={deptActivity} />;
}
