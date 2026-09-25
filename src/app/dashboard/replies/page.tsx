import { createClient } from "@/lib/supabase/server";
import { correctStatus } from "@/lib/answer-status";
import type { AdminProfile } from "@/lib/admin-reply";
import { RepliesClient, type PendingQuestion } from "./replies-client";

export const dynamic = "force-dynamic";

function cleanId(id: string | null | undefined): string {
  return String(id || "").replace(/["'=]/g, "").trim().toLowerCase();
}

interface LogRow {
  id: string;
  line_user_id: string | null;
  display_name: string | null;
  user_message: string | null;
  ai_response: string | null;
  status: string;
  created_at: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
  admin_replied_by: string | null;
  quote_token: string | null;
}

interface EmployeeRow {
  line_user_id: string | null;
  name: string | null;
  name_th: string | null;
  department: string | null;
  position: string | null;
}

export default async function RepliesPage() {
  let questions: PendingQuestion[] = [];
  let admin: AdminProfile | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const [logsResult, employeesResult, adminResult] = await Promise.all([
      // success rows are fetched too: rows logged by the older workflow were
      // filed as success even when the bot could not answer, and correctStatus
      // re-files them the same way Users & Logs does.
      supabase
        .from("chat_logs")
        .select(
          "id, line_user_id, display_name, user_message, ai_response, status, created_at, admin_reply, admin_replied_at, admin_replied_by, quote_token"
        )
        .in("status", ["success", "not_found"])
        .order("created_at", { ascending: false }),
      supabase.from("employee_test").select("line_user_id, name, name_th, department, position"),
      supabase
        .from("admin_users")
        .select("email, emp_id, name, name_th, position, department")
        .eq("user_id", user?.id ?? "")
        .maybeSingle(),
    ]);
    admin = (adminResult.data as AdminProfile | null) ?? null;

    const byLineId = new Map<string, EmployeeRow>();
    ((employeesResult.data as EmployeeRow[]) || []).forEach((e) => {
      if (e.line_user_id) byLineId.set(cleanId(e.line_user_id), e);
    });

    questions = ((logsResult.data as LogRow[]) || [])
      .map(correctStatus)
      .filter((log) => log.status === "not_found" && log.user_message?.trim())
      .map((log) => {
        const emp = byLineId.get(cleanId(log.line_user_id));
        return {
          id: log.id,
          question: String(log.user_message).replace(/^=+/, "").trim(),
          botAnswer: String(log.ai_response || "").replace(/^=+/, "").trim(),
          createdAt: log.created_at,
          askerName: emp ? [emp.name_th, emp.name].filter(Boolean).join(" / ") : log.display_name || "ไม่ทราบชื่อ",
          askerDept: emp?.department || "ยังไม่ลงทะเบียน",
          askerPosition: emp?.position || null,
          adminReply: log.admin_reply,
          adminRepliedAt: log.admin_replied_at,
          adminRepliedBy: log.admin_replied_by,
          canQuote: !!log.quote_token?.trim(),
        };
      });
  } catch (error) {
    console.error("Failed to load pending replies:", error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-1 border-b border-zinc-200/80 dark:border-zinc-800">
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Pending Replies
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
          คำถามที่บอทตอบไม่ได้ (สถานะ Not Found) ตอบกลับไปหาพนักงานทาง LINE ได้จากหน้านี้
        </p>
      </div>

      <RepliesClient questions={questions} admin={admin} />
    </div>
  );
}
