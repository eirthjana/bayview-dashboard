import { createClient } from "@/lib/supabase/server";
import { ChatLogsTable } from "@/components/users/chat-logs-table";
import type { ChatLog, Employee } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  let chatLogs: ChatLog[] = [];
  let employees: Employee[] = [];

  try {
    const supabase = await createClient();

    const [logsResult, employeeTestResult] = await Promise.all([
      // Latest 500 logs for display
      supabase
        .from("chat_logs")
        .select("*")
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

      <ChatLogsTable chatLogs={chatLogs} employees={employees} />
    </div>
  );
}
