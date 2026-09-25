import { createClient } from "@/lib/supabase/server";
import { AdminsClient, type AdminRow, type EmployeeOption } from "./admins-client";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  let admins: AdminRow[] = [];
  let employees: EmployeeOption[] = [];
  let currentUserId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;

    const [adminsResult, employeesResult] = await Promise.all([
      supabase
        .from("admin_users")
        .select("id, user_id, email, name, name_th, created_at")
        .order("created_at", { ascending: true }),
      // Picker for "เพิ่มแอดมิน": choosing an employee fills in their details.
      supabase
        .from("employee_test")
        .select("emp_id, name, name_th, email, status")
        .order("emp_id", { ascending: true }),
    ]);
    admins = (adminsResult.data as AdminRow[]) || [];
    employees = ((employeesResult.data as (EmployeeOption & { status: string | null })[]) || []).filter(
      (e) => e.status !== "disabled"
    );
  } catch (error) {
    console.error("Failed to load admin accounts:", error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="pb-1 border-b border-zinc-200/80 dark:border-zinc-800">
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Admin Accounts
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
          บัญชีที่เข้า Dashboard ได้ เพิ่มได้โดยแอดมินเท่านั้น ชื่อในหน้านี้คือชื่อที่ใช้ตอบข้อความพนักงาน
        </p>
      </div>

      <AdminsClient admins={admins} employees={employees} currentUserId={currentUserId} />
    </div>
  );
}
