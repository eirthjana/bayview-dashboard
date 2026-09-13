import { createClient } from "@/lib/supabase/server";
import { ChatLogsTable } from "@/components/users/chat-logs-table";
import type { ChatLog, Employee } from "@/lib/types";

export const dynamic = "force-dynamic";

// "error" is absent on purpose — failed requests stay in chat_logs for
// troubleshooting in Supabase but are never shown in the dashboard, so
// ?status=error falls back to "all" rather than rendering an empty table.
const STATUS_VALUES = ["all", "success", "not_found", "unauthorized"] as const;
type StatusFilterType = (typeof STATUS_VALUES)[number];

/** Today in Bangkok as YYYY-MM-DD — the format the log table compares against. */
function bangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface UsersPageProps {
  // Stat cards on other pages deep-link here with the view already narrowed,
  // e.g. Answer Accuracy -> ?status=not_found, Active Today -> ?range=today.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const one = (k: string) => (Array.isArray(params[k]) ? params[k][0] : params[k]) || "";

  const rawStatus = one("status");
  const initialStatus: StatusFilterType = (STATUS_VALUES as readonly string[]).includes(rawStatus)
    ? (rawStatus as StatusFilterType)
    : "all";

  const today = one("range") === "today" ? bangkokToday() : "";
  const initialStartDate = today || (ISO_DATE.test(one("from")) ? one("from") : "");
  const initialEndDate = today || (ISO_DATE.test(one("to")) ? one("to") : "");

  let chatLogs: ChatLog[] = [];
  let employees: Employee[] = [];

  try {
    const supabase = await createClient();

    const [logsResult, employeeTestResult] = await Promise.all([
      // Latest 500 logs for display, failed requests excluded
      supabase
        .from("chat_logs")
        .select("*")
        .neq("status", "error")
        .order("created_at", { ascending: false })
        .limit(500),
      // Employee list directly from employee_test
      supabase
        .from("employee_test")
        .select("emp_id, name, department, position, line_user_id, access_level, line_name, status"),
    ]);

    if (!logsResult.error && logsResult.data) {
      chatLogs = logsResult.data as ChatLog[];
    }

    if (!employeeTestResult.error && employeeTestResult.data) {
      employees = employeeTestResult.data as Employee[];
    }
  } catch (error) {
    console.error("Failed to fetch chat logs and employees from employee_test:", error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Users &amp; Chat Logs
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
            ประวัติการสนทนาทั้งหมดพร้อมระบบค้นหาและตัวกรองข้อมูลขั้นสูงแบบเรียลไทม์
          </p>
        </div>
      </div>

      <ChatLogsTable
        chatLogs={chatLogs}
        employees={employees}
        initialStatus={initialStatus}
        initialStartDate={initialStartDate}
        initialEndDate={initialEndDate}
      />
    </div>
  );
}
