import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";
import { normalizeStatusKey } from "@/components/dashboard/status-badge";
import type { DailyUsage, ChatLog, DailyTokenUsage, DeptTokenUsage, Employee } from "@/lib/types";

export const dynamic = "force-dynamic";

// Clean string by stripping quotes, equal signs, and whitespace
function cleanId(id: string | null | undefined): string {
  if (!id) return "";
  return String(id)
    .replace(/^["'=]+/, "")
    .replace(/["'=]+$/, "")
    .replace(/=/g, "")
    .trim()
    .toLowerCase();
}

// Generate last 30 days date slots with actual per-status counts from chat
// logs (success/not_found/unauthorized) — the same statuses shown everywhere
// else (StatusBadge, StatusDot). Failed requests never reach here: they are
// excluded by the query below and would have no series to land in anyway.
function getDailyUsageFromLogs(logs: ChatLog[]): DailyUsage[] {
  const days = 30;
  const result: DailyUsage[] = [];
  const now = new Date();

  const emptyStats = () => ({ success: 0, not_found: 0, unauthorized: 0 });
  const countMap = new Map<string, ReturnType<typeof emptyStats>>();

  logs.forEach((log) => {
    const key = normalizeStatusKey(log.status);
    // normalizeStatusKey maps anything unrecognised to "error", which has no
    // bucket here — skip those rather than crashing on an undefined counter.
    if (key === "error") return;
    const logDate = new Date(log.created_at).toISOString().split("T")[0];
    const current = countMap.get(logDate) || emptyStats();
    current[key] += 1;
    countMap.set(logDate, current);
  });

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const stats = countMap.get(key) || emptyStats();

    result.push({
      date: d.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
      ...stats,
    });
  }

  return result;
}

// Build daily token usage for last 30 days
function getDailyTokenUsage(
  logs: Array<{ created_at: string; tokens_used: number }>
): DailyTokenUsage[] {
  const days = 30;
  const result: DailyTokenUsage[] = [];
  const now = new Date();

  const tokenMap = new Map<string, number>();
  logs.forEach((log) => {
    const date = new Date(log.created_at).toISOString().split("T")[0];
    tokenMap.set(date, (tokenMap.get(date) || 0) + (log.tokens_used || 0));
  });

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    result.push({
      date: d.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
      tokens: tokenMap.get(key) || 0,
    });
  }

  return result;
}

export default async function DashboardPage() {
  let stats = {
    totalUsers: 0,
    activeUsersToday: 0,
    totalMessages: 0,
    answerAccuracy: 0,
    totalTokensUsed: 0,
  };
  let dailyUsage: DailyUsage[] = [];
  let recentLogs: ChatLog[] = [];
  let dailyTokenUsage: DailyTokenUsage[] = [];
  let deptTokenUsage: DeptTokenUsage[] = [];

  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all data in parallel from employee_test and chat_logs
    // Failed requests stay in chat_logs for troubleshooting in Supabase, but
    // the dashboard never shows them — so every query below excludes them.
    // Leaving them in would inflate Total Messages and put a series on the
    // usage chart and rows in Recent Activity that nothing else displays.
    const [
      allLineIdsResult, // for distinct user count
      activeResult,
      messagesResult,
      successResult,
      notFoundResult,
      logsResult,
      thirtyDaysLogsResult,
      tokenSumResult,
      employeeTestResult,
    ] = await Promise.all([
      // Unique users from chat_logs
      supabase.from("chat_logs").select("line_user_id").neq("status", "error"),
      // Active today from chat_logs
      supabase
        .from("chat_logs")
        .select("line_user_id")
        .gte("created_at", today)
        .neq("status", "error"),
      supabase
        .from("chat_logs")
        .select("id", { count: "exact", head: true })
        .neq("status", "error"),
      // Answer accuracy is success measured against not_found — of the
      // questions the bot actually tried to answer, how many it could.
      // unauthorized is left out: being denied by the access rules is the
      // system working, not a failure to find an answer.
      supabase
        .from("chat_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "success"),
      supabase
        .from("chat_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "not_found"),
      supabase
        .from("chat_logs")
        .select("*")
        .neq("status", "error")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("chat_logs")
        .select("created_at, status, tokens_used, line_user_id")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .neq("status", "error"),
      // Total tokens sum across all time
      supabase.from("chat_logs").select("tokens_used").neq("status", "error"),
      // Fetch employee list directly from employee_test
      supabase.from("employee_test").select("*"),
    ]);

    const allEmployees: Employee[] = (!employeeTestResult.error && employeeTestResult.data)
      ? (employeeTestResult.data as Employee[])
      : [];

    // Build lookup maps for employee matching
    const empLineIdMap = new Map<string, Employee>();
    const empLineNameMap = new Map<string, Employee>();

    allEmployees.forEach((emp) => {
      if (emp.line_user_id) {
        const idKey = cleanId(emp.line_user_id);
        if (idKey) empLineIdMap.set(idKey, emp);
      }
      if (emp.line_name) {
        const nameKey = cleanId(emp.line_name);
        if (nameKey) empLineNameMap.set(nameKey, emp);
      }
    });

    // COUNT(DISTINCT line_user_id) — accurate unique user count
    const totalUsers = new Set(
      (allLineIdsResult.data || [])
        .map((r: { line_user_id: string }) => cleanId(r.line_user_id))
        .filter(Boolean)
    ).size;

    // Active today: distinct users
    const activeUsersToday = new Set(
      (activeResult.data || [])
        .map((r: { line_user_id: string }) => cleanId(r.line_user_id))
        .filter(Boolean)
    ).size;

    const totalMessages = messagesResult.count || 0;
    const successCount = successResult.count || 0;
    const notFoundCount = notFoundResult.count || 0;
    const answered = successCount + notFoundCount;

    // Sum total tokens
    const allTokens = tokenSumResult.data || [];
    const totalTokensUsed = allTokens.reduce(
      (sum: number, row: { tokens_used: number }) => sum + (row.tokens_used || 0),
      0
    );

    stats = {
      totalUsers,
      activeUsersToday,
      totalMessages,
      answerAccuracy:
        answered > 0 ? Number(((successCount / answered) * 100).toFixed(1)) : 0,
      totalTokensUsed,
    };

    // Enrich recent logs with matched employee from employee_test and clean messages
    const rawRecent = (logsResult.data as ChatLog[]) || [];
    recentLogs = rawRecent.map((log) => {
      const cleanLine = cleanId(log.line_user_id);
      // Try match by line_user_id, then by display_name if line_name matches
      let matchedEmp = empLineIdMap.get(cleanLine) || null;
      if (!matchedEmp && log.display_name) {
        matchedEmp = empLineNameMap.get(cleanId(log.display_name)) || null;
      }

      return {
        ...log,
        display_name: log.display_name || null,
        user_message: log.user_message ? String(log.user_message).replace(/^=+/, "").trim() : null,
        ai_response: log.ai_response ? String(log.ai_response).replace(/^=+/, "").trim() : null,
        employee: matchedEmp,
      };
    });

    dailyUsage = getDailyUsageFromLogs((thirtyDaysLogsResult.data as ChatLog[]) || []);
    dailyTokenUsage = getDailyTokenUsage(thirtyDaysLogsResult.data || []);

    // Build department token usage by joining employee_test with chat logs
    if (allEmployees.length > 0) {
      const deptMap = new Map<string, number>();
      const lineIdToDept = new Map<string, string>();
      allEmployees.forEach((e) => {
        if (e.line_user_id && e.department) {
          const idKey = cleanId(e.line_user_id);
          lineIdToDept.set(idKey, e.department);
        }
      });

      (thirtyDaysLogsResult.data || []).forEach((log: { line_user_id: string; tokens_used: number }) => {
        const idKey = cleanId(log.line_user_id);
        const dept = lineIdToDept.get(idKey);
        if (dept) {
          deptMap.set(dept, (deptMap.get(dept) || 0) + (log.tokens_used || 0));
        }
      });

      deptTokenUsage = Array.from(deptMap.entries()).map(([department, tokens]) => ({
        department,
        tokens,
      }));
    }
  } catch (error) {
    console.error("Failed to fetch dashboard data from Supabase:", error);
    dailyUsage = getDailyUsageFromLogs([]);
    dailyTokenUsage = getDailyTokenUsage([]);
  }

  return (
    <DashboardClient
      data={{
        stats,
        dailyUsage,
        recentLogs,
        dailyTokenUsage,
        deptTokenUsage,
      }}
    />
  );
}
