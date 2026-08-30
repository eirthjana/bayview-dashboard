import { createClient } from "@/lib/supabase/server";
import { EmployeesTable } from "@/components/employees/employees-table";
import type { EmployeeRegistry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  let employees: EmployeeRegistry[] = [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("employee_test")
      .select("*")
      .order("emp_id", { ascending: true });

    if (!error && data) {
      employees = data;
    }
  } catch (error) {
    console.error("Failed to fetch employee_test from Supabase:", error);
    employees = [];
  }

  const linkedCount = employees.filter((e) => e.line_user_id).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Employees Management</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          จัดการตำแหน่ง แผนก และสิทธิ์การเข้าถึงของพนักงานที่ผูก LINE ID กับบอท
          {" · "}
          <span className="text-emerald-400">{linkedCount}</span> / {employees.length} คนผูก LINE แล้ว
        </p>
      </div>

      <EmployeesTable employees={employees} />
    </div>
  );
}
