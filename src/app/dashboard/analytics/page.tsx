import { createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "./analytics-client";
import type { AnalyticsSummary, FaqItem, HourlyUsage, DeptActivity } from "@/lib/types";

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

// Best-effort topic tag for a FAQ entry: only tag when a distinctive
// sub-department keyword appears (e.g. "Reservation"), otherwise fall back
// to "General" — a broad term like "Front Office" covers too many roles
// (FOM, GSA, Bell, GRO...) to be a useful single tag on its own.
const TOPIC_KEYWORDS: { pattern: RegExp; tag: string }[] = [
  { pattern: /reservation|จอง/i, tag: "Reservation" },
  { pattern: /housekeeping|แม่บ้าน/i, tag: "Housekeeping" },
  { pattern: /accounting|บัญชี/i, tag: "Accounting" },
  { pattern: /kitchen|f\s*&\s*b|food\s*&?\s*beverage|ครัว|อาหารและเครื่องดื่ม/i, tag: "F&B" },
  { pattern: /engineering|ช่างซ่อมบำรุง|วิศวกรรม/i, tag: "Engineering" },
  { pattern: /human resources|\bhr\b|ฝ่ายบุคคล/i, tag: "HR" },
];

function classifyTopic(question: string): string {
  const match = TOPIC_KEYWORDS.find(({ pattern }) => pattern.test(question));
  return match?.tag ?? "General";
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
}

export default async function AnalyticsPage() {
  let summary: AnalyticsSummary = {
    totalInquiries: 0,
    avgTokensPerQuery: 0,
    peakTrafficTime: "-",
    mostActiveDept: "-",
  };
  let faqs: FaqItem[] = [];
  let hourly: HourlyUsage[] = [];
  let deptActivity: DeptActivity[] = [];

  try {
    const supabase = await createClient();

    const [logsResult, employeesResult] = await Promise.all([
      supabase
        .from("chat_logs")
        .select("user_message, tokens_used, created_at, line_user_id"),
      supabase.from("employee_test").select("line_user_id, department"),
    ]);

    const logs = (logsResult.data as ChatLogRow[]) || [];
    const employees = (employeesResult.data as EmployeeDeptRow[]) || [];

    const deptByLineId = new Map<string, string>();
    employees.forEach((e) => {
      if (e.line_user_id && e.department) {
        deptByLineId.set(cleanId(e.line_user_id), e.department);
      }
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
    const deptCounts = new Map<string, number>();
    logs.forEach((l) => {
      const dept = deptByLineId.get(cleanId(l.line_user_id)) || "Guest / Unregistered";
      deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
    });
    deptActivity = Array.from(deptCounts.entries()).map(([department, count]) => ({
      department,
      count,
    }));
    const mostActiveDept =
      deptActivity.length > 0
        ? [...deptActivity].sort((a, b) => b.count - a.count)[0].department
        : "-";

    // Top FAQs: group by exact (cleaned) question text so repeated identical
    // asks count as one entry, ranked by frequency.
    const faqMap = new Map<string, number>();
    logs.forEach((l) => {
      const q = l.user_message ? String(l.user_message).replace(/^=+/, "").trim() : "";
      if (!q) return;
      faqMap.set(q, (faqMap.get(q) || 0) + 1);
    });
    faqs = Array.from(faqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([question, count]) => ({
        question,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        tag: classifyTopic(question),
      }));

    summary = {
      totalInquiries: total,
      avgTokensPerQuery: total > 0 ? Math.round(totalTokens / total) : 0,
      peakTrafficTime,
      mostActiveDept,
    };
  } catch (error) {
    console.error("Failed to fetch analytics data from Supabase:", error);
  }

  return <AnalyticsClient summary={summary} faqs={faqs} hourly={hourly} deptActivity={deptActivity} />;
}
