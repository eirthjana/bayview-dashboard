import { createClient } from "@/lib/supabase/server";
import { EMPLOYEE_TABLE } from "@/lib/config";
import { EmployeesTable } from "@/components/employees/employees-table";
import type { EmployeeRegistry } from "@/lib/types";
import { LoadErrorBanner } from "@/components/dashboard/load-error-banner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmployeesPage() {
  let employees: EmployeeRegistry[] = [];
  let loadError = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(EMPLOYEE_TABLE)
      .select("*")
      .order("emp_id", { ascending: true });

    if (error) throw error;
    employees = data ?? [];
  } catch (error) {
    console.error(`Failed to fetch ${EMPLOYEE_TABLE} from Supabase:`, error);
    employees = [];
    loadError = true;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {loadError && <LoadErrorBanner what="รายชื่อพนักงาน" />}
      <EmployeesTable employees={employees} table={EMPLOYEE_TABLE} loadFailed={loadError} />
    </div>
  );
}
