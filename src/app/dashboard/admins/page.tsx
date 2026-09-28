import { createClient } from "@/lib/supabase/server";
import { AdminsClient, type AdminRow, type EmployeeOption } from "./admins-client";
import { getAdminStatusMap, getAdminLoginLogs, type AdminLoginLog } from "@/lib/admin-manage";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  let admins: AdminRow[] = [];
  let employees: EmployeeOption[] = [];
  let loginLogs: AdminLoginLog[] = [];
  let currentUserId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;

    const [adminsResult, employeesResult, statusMap, logs] = await Promise.all([
      supabase
        .from("admin_users")
        .select("id, user_id, email, name, name_th, is_active, created_at")
        .order("created_at", { ascending: true }),
      // Picker for "เพิ่มแอดมิน": choosing an employee fills in their details.
      supabase
        .from("employee_test")
        .select("emp_id, name, name_th, email, status")
        .order("emp_id", { ascending: true }),
      getAdminStatusMap(),
      getAdminLoginLogs(),
    ]);

    const rawAdmins = (adminsResult.data as (Omit<AdminRow, "status">)[]) || [];
    admins = rawAdmins.map((a) => {
      const isActive = a.is_active !== undefined && a.is_active !== null ? a.is_active : statusMap[a.id] !== "suspended";
      return {
        ...a,
        is_active: isActive,
        status: (isActive ? "active" : "suspended") as "active" | "suspended",
      };
    });

    employees = ((employeesResult.data as (EmployeeOption & { status: string | null })[]) || []).filter(
      (e) => e.status !== "disabled"
    );

    loginLogs = logs;
  } catch (error) {
    console.error("Failed to load admin accounts and logs:", error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Admin Manage
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
            จัดการรายชื่อผู้ดูแลระบบ สิทธิ์การเข้าถึง และตรวจสอบประวัติการเข้าสู่ระบบ (Login Logs)
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0C645B]/10 dark:bg-[#17A594]/20 text-[#0C645B] dark:text-emerald-400 border border-[#0C645B]/20 dark:border-emerald-500/30 shrink-0 w-fit">
          Bayview Access Control
        </span>
      </div>

      <AdminsClient
        admins={admins}
        employees={employees}
        loginLogs={loginLogs}
        currentUserId={currentUserId}
      />
    </div>
  );
}
